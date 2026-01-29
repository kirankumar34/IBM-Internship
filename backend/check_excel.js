const XLSX = require('xlsx');
const path = require('path');

const filePath = 'c:\\ibm intern\\Dummy_Employee_Data_150_Rebalanced.xlsx';
try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length > 0) {
        console.log('Headers:', Object.keys(data[0]));
        console.log('First Row:', data[0]);
    } else {
        console.log('Empty excel file');
    }
} catch (error) {
    console.error('Error reading excel:', error);
}
