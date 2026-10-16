/**
 * Fernwood photo study: Google Apps Script endpoint.
 * Bound to a Google Sheet (Extensions > Apps Script). Run setup() once, then deploy as a web app:
 * Execute as: Me. Who has access: Anyone.
 */
var TOKEN = 'change-me'; // Must match CONFIG.TOKEN in the page. A spam filter, not a secret.
var ARMS = ['status_quo', 'direct'];

var EVENT_COLS = ['pid', 'session', 'seq', 't_ms', 'ts', 'screen', 'verb', 'object', 'result'];
var PART_COLS = ['pid', 'session_id', 'study_id', 'study_version', 'arm', 'assign_source', 'subject', 'name_given',
  'started_at', 'completed_at', 'status', 'device', 'viewport', 'menu_first_ms', 'discovery_ms', 'to_report_ms',
  'decision_ms', 'select_to_next_ms', 'report_total_ms', 'task_total_ms', 'policy_opens', 'policy_dwell_ms',
  'first_path', 'final_path', 'path_changes', 'back_count', 'option_order', 'report_opens', 'hide_count', 'block_count',
  'nontarget_report', 'gave_up', 'form_json', 'q_clarity', 'q_confidence', 'q_ai_look', 'q_realism', 'q_prior_report',
  'q_best_describes', 'q_first_look_text', 'prot_json', 'hidden_ms'];

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_(name, cols) {
  var s = ss_().getSheetByName(name);
  if (!s) {
    s = ss_().insertSheet(name);
    s.appendRow(cols);
    s.setFrozenRows(1);
  }
  return s;
}

function setup() {
  sheet_('Participants', PART_COLS);
  sheet_('Events', EVENT_COLS);
  sheet_('Assignments', ['pid', 'arm', 'ts']);
  var d = sheet_('Dictionary', ['sheet', 'column', 'meaning']);
  if (d.getLastRow() < 2) {
    var rows = [
      ['Participants', 'arm', 'status_quo or direct'],
      ['Participants', 'assign_source', 'server (balanced), client (fallback) or url_preview'],
      ['Participants', 'subject', 'self or standin'],
      ['Participants', 'menu_first_ms', 'Task start to first post menu open'],
      ['Participants', 'discovery_ms', 'Task start to target post 50 percent visible'],
      ['Participants', 'to_report_ms', 'Target post visible to report dialog open'],
      ['Participants', 'decision_ms', 'Report dialog open to first option selected (primary outcome)'],
      ['Participants', 'select_to_next_ms', 'First option selected to Next'],
      ['Participants', 'report_total_ms', 'Report dialog open to submit'],
      ['Participants', 'task_total_ms', 'Task start to submit'],
      ['Participants', 'policy_dwell_ms', 'Total time the guidelines were open'],
      ['Participants', 'first_path', 'First option selected (ip, imp, priv, har, nud, scam, ai, other)'],
      ['Participants', 'final_path', 'Option submitted'],
      ['Participants', 'path_changes', 'Times the selected option changed'],
      ['Participants', 'back_count', 'Times Back was used'],
      ['Participants', 'option_order', 'Order options were shown, top to bottom'],
      ['Participants', 'gave_up', '1 if the participant chose I would stop here'],
      ['Participants', 'hidden_ms', 'Time the tab was hidden; excluded from all durations'],
      ['Events', 't_ms', 'Milliseconds since page load, excluding hidden-tab time']
    ];
    d.getRange(2, 1, rows.length, 3).setValues(rows);
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.token !== TOKEN) return json_({ error: 'token' });
  if (p.action === 'check') return json_({ ok: true });
  if (p.action === 'assign') {
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var a = sheet_('Assignments', ['pid', 'arm', 'ts']);
      var vals = a.getLastRow() > 1 ? a.getRange(2, 1, a.getLastRow() - 1, 2).getValues() : [];
      for (var i = 0; i < vals.length; i++) if (vals[i][0] === p.pid) return json_({ arm: vals[i][1] });
      var counts = {};
      ARMS.forEach(function (x) { counts[x] = 0; });
      vals.forEach(function (r) { if (counts[r[1]] !== undefined) counts[r[1]]++; });
      var arm = counts[ARMS[0]] <= counts[ARMS[1]] ? ARMS[0] : ARMS[1];
      if (counts[ARMS[0]] === counts[ARMS[1]]) arm = ARMS[Math.floor(Math.random() * 2)];
      a.appendRow([p.pid, arm, new Date().toISOString()]);
      return json_({ arm: arm });
    } finally { lock.releaseLock(); }
  }
  return json_({ error: 'action' });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ error: 'parse' }); }
  if (body.token !== TOKEN) return json_({ error: 'token' });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (body.type === 'events' && body.rows && body.rows.length) {
      var s = sheet_('Events', EVENT_COLS);
      var out = body.rows.map(function (r) { return EVENT_COLS.map(function (c) { return clean_(r[c]); }); });
      s.getRange(s.getLastRow() + 1, 1, out.length, EVENT_COLS.length).setValues(out);
    } else if (body.type === 'summary' && body.row) {
      var p = sheet_('Participants', PART_COLS);
      var row = PART_COLS.map(function (c) { return clean_(body.row[c]); });
      var last = p.getLastRow();
      var at = -1;
      if (last > 1) {
        var ids = p.getRange(2, 1, last - 1, 1).getValues();
        for (var i = 0; i < ids.length; i++) if (ids[i][0] === body.row.pid) { at = i + 2; break; }
      }
      if (at > 0) p.getRange(at, 1, 1, PART_COLS.length).setValues([row]);
      else p.appendRow(row);
    }
    return json_({ ok: true });
  } finally { lock.releaseLock(); }
}

// Prevent spreadsheet formula injection from free-text answers.
function clean_(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}
