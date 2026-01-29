const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '..', 'Dummy_Employee_Data_150_Rebalanced.xlsx');

try {
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    const superAdmin = data.find(row => row['Employee\'s Role'] === 'Super Admin' || row['Login ID'] === 'superadmin01');

    if (superAdmin) {
        console.log('Super Admin found in Excel:');
        console.log('Login ID:', superAdmin['Login ID']);
        console.log('Password:', superAdmin['Password']);
    } else {
        console.log('Super Admin NOT found in Excel');
    }

} catch (err) {
    console.error('Error reading Excel:', err.message);
}
