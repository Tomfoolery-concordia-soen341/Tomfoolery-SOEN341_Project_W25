const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function addMissingUsernames() {
    try {
        console.log("🚀 Starting username migration...");

        // Get all users
        const usersSnapshot = await db.collection("users").get();
        let updatedCount = 0;

        // Update each user missing a username
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();

            if (!userData.username) {
                // Generate username from email (or random if no email)
                const emailPrefix = userData.email?.split("@")[0] || "";
                const randomId = Math.random().toString(36).substring(2, 8);
                const newUsername = emailPrefix || `user_${randomId}`;

                // Update the document
                await userDoc.ref.update({ username: newUsername });
                updatedCount++;

                console.log(`✅ Updated ${userDoc.id} → ${newUsername}`);
            }
        }

        console.log(`🎉 Migration complete! Updated ${updatedCount} users.`);
    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        process.exit(); // Close script when done
    }
}

// Run the migration
addMissingUsernames();