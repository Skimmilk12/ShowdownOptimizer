// ===========================================
// GOOGLE APPS SCRIPT - INSERT AT CORRECT POSITION
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

function doPost(e) {
  try {
    // Get the data from form submission
    var jsonData = e.parameter ? e.parameter.data : null;

    if (!jsonData) {
      if (e.postData && e.postData.contents) {
        jsonData = e.postData.contents;
      } else {
        return ContentService.createTextOutput('No data parameter');
      }
    }

    var data = JSON.parse(jsonData);
    var position = data.position;
    var records = data.records;

    if (!position || !SHEET_IDS[position]) {
      return ContentService.createTextOutput('Invalid position: ' + position);
    }

    if (!records || records.length === 0) {
      return ContentService.createTextOutput('No records');
    }

    // Open the sheet
    var spreadsheet = SpreadsheetApp.openById(SHEET_IDS[position]);
    var sheet = spreadsheet.getSheets()[0];

    // Get all existing data to find where to insert
    var allData = sheet.getDataRange().getValues();

    // Sort records by week number DESCENDING (highest week first)
    // This ensures when we insert them one by one, they end up in correct order
    records.sort(function(a, b) {
      return (b.week || 0) - (a.week || 0);
    });

    var count = 0;
    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      var playerName = record.name || '';
      var weekNum = record.week || 0;

      // Build row: Name, Position, Team, Week, Opponent, Result, [stats], FPTS, Salary
      var row = [
        playerName,
        record.position || '',
        record.team || '',
        weekNum,
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

      // Find the correct position to insert this row
      var insertRow = findInsertPosition(allData, playerName, weekNum);

      if (insertRow > 0) {
        // Insert a new row at this position and set values
        sheet.insertRowBefore(insertRow);
        sheet.getRange(insertRow, 1, 1, row.length).setValues([row]);

        // Update allData to reflect the insertion (for subsequent records)
        allData.splice(insertRow - 1, 0, row);
      } else {
        // Player not found, append at end
        sheet.appendRow(row);
        allData.push(row);
      }

      count++;
    }

    return ContentService.createTextOutput('Added ' + count + ' rows to ' + position);

  } catch (error) {
    return ContentService.createTextOutput('Error: ' + error.toString());
  }
}

// Find the correct row to insert a new record
// Returns the 1-based row number where we should insert
// Games are sorted by week DESCENDING (highest week at top of player's section)
function findInsertPosition(allData, playerName, weekNum) {
  var playerFirstRow = -1;
  var playerLastRow = -1;

  // Find the player's section (first and last row)
  for (var i = 0; i < allData.length; i++) {
    var rowName = allData[i][0];
    if (rowName === playerName) {
      if (playerFirstRow === -1) {
        playerFirstRow = i;
      }
      playerLastRow = i;
    } else if (playerFirstRow !== -1 && rowName !== playerName && rowName !== '') {
      // We've passed the player's section
      break;
    }
  }

  if (playerFirstRow === -1) {
    // Player not found in sheet
    return -1;
  }

  // Now find where in the player's section this week should go
  // Weeks are sorted descending (highest first)
  for (var i = playerFirstRow; i <= playerLastRow; i++) {
    var existingWeek = parseInt(allData[i][3]) || 0;  // Column D = Week
    if (weekNum > existingWeek) {
      // Insert here (before this row)
      return i + 1;  // +1 for 1-based row index
    }
  }

  // This week is lower than all existing weeks, insert after last row
  return playerLastRow + 2;  // +2 because 1-based and after
}

function doGet(e) {
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
