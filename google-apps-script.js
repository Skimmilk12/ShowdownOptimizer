// ===========================================
// GOOGLE APPS SCRIPT - DEBUG VERSION
// ===========================================
// Copy this ENTIRE code into your Apps Script project
// Then: Deploy > New deployment > Web app > Execute as Me, Anyone > Deploy
// Copy the NEW URL to ShowdownOptimizer

const SHEET_IDS = {
  QB: '1nmPFQ1P1y8N0WPxHOq_FUEuBhSAW6ddLecsuRjyOqHo',
  RB: '1C8UDTi_jXMRE4MHy5Zt4nNkCxKR22QVoXGCWiTAAuaM',
  WR: '1MXTV7mLSLywoslITmHrbjcIKBK2c99RVdteDHxA9dv8',
  TE: '1hRlW5XhqKeSzWE1-E0RHKwUdt99fnUM2zzwk3QDborQ',
  DST: '1RNKJDGegnWt7G7Pmxo6kwHZGTIvvDIyOaTp9racjol8'
};

// Create a log sheet to help debug
function logToSheet(message) {
  try {
    var logSheet = SpreadsheetApp.openById(SHEET_IDS.QB);
    var sheet = logSheet.getSheetByName('DebugLog');
    if (!sheet) {
      sheet = logSheet.insertSheet('DebugLog');
    }
    sheet.appendRow([new Date(), message]);
  } catch (e) {
    // Can't log, just continue
  }
}

function doPost(e) {
  logToSheet('doPost called');

  try {
    // Check what we received
    if (!e) {
      logToSheet('ERROR: No event object');
      return ContentService.createTextOutput('No event object');
    }

    logToSheet('e.parameter keys: ' + Object.keys(e.parameter || {}).join(', '));

    // Get the data from form submission
    var jsonData = e.parameter ? e.parameter.data : null;

    if (!jsonData) {
      // Try postData for raw POST body
      if (e.postData && e.postData.contents) {
        jsonData = e.postData.contents;
        logToSheet('Using postData.contents');
      } else {
        logToSheet('ERROR: No data in parameter or postData');
        return ContentService.createTextOutput('No data parameter');
      }
    } else {
      logToSheet('Using e.parameter.data');
    }

    logToSheet('Raw data length: ' + (jsonData ? jsonData.length : 0));

    var data;
    try {
      data = JSON.parse(jsonData);
    } catch (parseError) {
      logToSheet('ERROR parsing JSON: ' + parseError.toString());
      logToSheet('First 200 chars: ' + (jsonData || '').substring(0, 200));
      return ContentService.createTextOutput('JSON parse error: ' + parseError.toString());
    }

    var position = data.position;
    var records = data.records;

    logToSheet('Position: ' + position + ', Records: ' + (records ? records.length : 0));

    if (!position || !SHEET_IDS[position]) {
      logToSheet('ERROR: Invalid position: ' + position);
      return ContentService.createTextOutput('Invalid position: ' + position);
    }

    if (!records || records.length === 0) {
      logToSheet('ERROR: No records in payload');
      return ContentService.createTextOutput('No records');
    }

    // Open the sheet
    logToSheet('Opening sheet: ' + SHEET_IDS[position]);
    var spreadsheet = SpreadsheetApp.openById(SHEET_IDS[position]);
    var sheet = spreadsheet.getSheets()[0];
    logToSheet('Sheet opened: ' + sheet.getName());

    // Append each record
    var count = 0;
    for (var i = 0; i < records.length; i++) {
      var record = records[i];

      // Build row: Name, Position, Team, Week, Opponent, Result, [stats], FPTS, Salary
      var row = [
        record.name || '',
        record.position || '',
        record.team || '',
        record.week || '',
        record.opponent || '',
        record.result || ''
      ];

      // Add stats if present
      if (record.stats && record.stats.length > 0) {
        for (var j = 0; j < record.stats.length; j++) {
          row.push(record.stats[j]);
        }
      }

      // Add FPTS and Salary at the end
      row.push(record.fpts || 0);
      row.push(record.salaryFormatted || ('$' + (record.salary || 0)));

      logToSheet('Appending row ' + i + ': ' + row.slice(0, 5).join(', ') + '...');
      sheet.appendRow(row);
      count++;
    }

    logToSheet('SUCCESS: Added ' + count + ' rows to ' + position);
    return ContentService.createTextOutput('Added ' + count + ' rows to ' + position);

  } catch (error) {
    logToSheet('ERROR: ' + error.toString());
    return ContentService.createTextOutput('Error: ' + error.toString());
  }
}

function doGet(e) {
  logToSheet('doGet called');
  return ContentService.createTextOutput('API is running. POST data to add rows.');
}

// Test function - run this manually to verify sheet access
function testSheetAccess() {
  try {
    var spreadsheet = SpreadsheetApp.openById(SHEET_IDS.QB);
    var sheet = spreadsheet.getSheets()[0];
    sheet.appendRow(['TEST', 'ROW', 'AT', new Date().toISOString()]);
    Logger.log('Successfully wrote test row to QB sheet');
  } catch (e) {
    Logger.log('Error: ' + e.toString());
  }
}
