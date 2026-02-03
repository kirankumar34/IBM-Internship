const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '..', 'Dummy_Employee_Data_150_Rebalanced.xlsx');

try {
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(sheet);

    console.log('Total Rows:', excelData.length);
    console.log('Headers:', Object.keys(excelData[0]));

    const admin = excelData.find(row => row['Login ID'] === 'superadmin01');
    if (admin) {
        console.log('--- Super Admin Found in Excel ---');
        console.log('Login ID:', admin['Login ID']);
        console.log('Password:', admin['Password']);
        console.log('Role:', admin["Employee's Role"]);
    } else {
        console.log('superadmin01 NOT FOUND in Excel.');
        console.log('First 3 rows:', JSON.stringify(excelData.slice(0, 3), null, 2));
    }

} catch (err) {
    console.error('Error reading excel:', err);
}
