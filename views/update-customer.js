const db = require('../Database/Database');

const customerName = 'ธีรดนย์';
const newAddress = '21/1 ตำบลพืชอุดม อำเภอลำลูกกา จังหวัดปทุมธาณี';

db.get(
  'SELECT customer_id, customer_name FROM Customers WHERE customer_name LIKE ?',
  [`%${customerName}%`],
  (err, row) => {
    if (err) {
      console.error('Error finding customer:', err);
      process.exit(1);
    }

    if (!row) {
      console.log(`Customer "${customerName}" not found.`);
      process.exit(1);
    }

    console.log(`Found customer: ${row.customer_name} (ID: ${row.customer_id})`);

    // Update the address
    db.run(
      'UPDATE Customers SET address = ? WHERE customer_id = ?',
      [newAddress, row.customer_id],
      function (err) {
        if (err) {
          console.error('Error updating address:', err);
          process.exit(1);
        }

        console.log(`✓ Address updated successfully!`);
        console.log(`  Customer: ${row.customer_name}`);
        console.log(`  New Address: ${newAddress}`);
        process.exit(0);
      }
    );
  }
);
