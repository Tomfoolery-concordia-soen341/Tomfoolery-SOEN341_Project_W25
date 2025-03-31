const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://console.firebase.google.com/u/1/project/soen341-5e47f/firestore/databases/-default-/data'
});

const db = admin.firestore();
const auth = admin.auth();

async function migrateUsernames() {
    try {
        console.log('Starting user migration...');

        const usersSnapshot = await db.collection('users').get();
        console.log(`Found ${usersSnapshot.size} users to process`);

        let successCount = 0;
        let errorCount = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();

            if (userData.username) {
                try {
                    // Update Auth record
                    await auth.updateUser(userDoc.id, {
                        displayName: userData.username
                    });

                    // Update Firestore document
                    await db.collection('users').doc(userDoc.id).update({
                        displayName: userData.username,
                        username: admin.firestore.FieldValue.delete()
                    });

                    successCount++;
                    console.log(`Migrated user ${userDoc.id}`);
                } catch (error) {
                    errorCount++;
                    console.error(`Error migrating user ${userDoc.id}:`, error);
                }
            }
        }

        console.log(`Migration complete. Success: ${successCount}, Errors: ${errorCount}`);
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateUsernames();