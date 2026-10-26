const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const migrateToAtlas = async () => {
  const targetUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!targetUri) {
    console.error('ERROR: MONGODB_URI is not set in environment variables.');
    process.exit(1);
  }

  console.log('Connecting to target database...');
  await mongoose.connect(targetUri);
  const db = mongoose.connection.db;
  console.log(`Connected to database: ${mongoose.connection.name} on host ${mongoose.connection.host}`);

  const backupFile = path.resolve(__dirname, '../backups/atlas_migration_backup.json');
  if (!fs.existsSync(backupFile)) {
    console.error(`ERROR: Migration backup file not found at: ${backupFile}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(backupFile, 'utf8');
  const backup = JSON.parse(raw);

  const collections = ['users', 'workers', 'notifications'];

  for (const colName of collections) {
    const docs = backup[colName] || [];
    if (!docs.length) {
      console.log(`[${colName}] No documents to migrate.`);
      continue;
    }

    const col = db.collection(colName);
    let inserted = 0;
    let updated = 0;

    for (const doc of docs) {
      // Re-hydrate ObjectId
      const filter = doc._id ? { _id: new mongoose.Types.ObjectId(doc._id) } : { email: doc.email };
      const docToSave = { ...doc };
      if (docToSave._id) {
        docToSave._id = new mongoose.Types.ObjectId(docToSave._id);
      }
      if (docToSave.userId) {
        docToSave.userId = new mongoose.Types.ObjectId(docToSave.userId);
      }
      if (docToSave.createdAt) docToSave.createdAt = new Date(docToSave.createdAt);
      if (docToSave.updatedAt) docToSave.updatedAt = new Date(docToSave.updatedAt);

      const res = await col.updateOne(
        filter,
        { $set: docToSave },
        { upsert: true }
      );

      if (res.upsertedCount > 0) inserted++;
      else if (res.modifiedCount > 0) updated++;
    }

    const totalCount = await col.countDocuments();
    console.log(`[${colName}] Processed ${docs.length} docs: ${inserted} newly inserted, ${updated} updated. Total in database: ${totalCount}`);
  }

  // Summary validation
  const userCount = await db.collection('users').countDocuments();
  const workerCount = await db.collection('workers').countDocuments();
  const customerCount = await db.collection('users').countDocuments({ role: 'customer' });
  const workerUserCount = await db.collection('users').countDocuments({ role: 'worker' });
  const verifiedWorkers = await db.collection('workers').countDocuments({ verificationStatus: 'approved' });

  console.log('\n================ MIGRATION SUMMARY ================');
  console.log(`Total Users in Target DB:    ${userCount}`);
  console.log(`Registered Customers:        ${customerCount}`);
  console.log(`Registered Workers (Users):  ${workerUserCount}`);
  console.log(`Worker Profiles:             ${workerCount}`);
  console.log(`Verified Workers:            ${verifiedWorkers}`);
  console.log('===================================================\n');

  await mongoose.disconnect();
  console.log('Disconnected. Migration finished successfully!');
};

migrateToAtlas().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
