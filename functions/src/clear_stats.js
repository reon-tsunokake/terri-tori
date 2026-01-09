const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize app (assuming default credentials or already set in environment)
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = getFirestore();

async function clearStats() {
    console.log("Clearing stats data...");

    // 1. Get Current Season
    const seasonsSnap = await db.collection('seasons').where('isCurrent', '==', true).limit(1).get();
    if (seasonsSnap.empty) {
        console.log("No current season found.");
        return;
    }
    const seasonId = seasonsSnap.docs[0].id;
    console.log(`Target Season: ${seasonId}`);

    // 2. Target Group 1 (adjust if needed)
    const groupId = "1";
    const groupRef = db.collection('seasons').doc(seasonId).collection('groups').doc(groupId);

    // 3. Delete stats field
    await groupRef.update({
        stats: admin.firestore.FieldValue.delete()
    });

    console.log(`Stats cleared for Season ${seasonId}, Group ${groupId}`);
}

clearStats().catch(console.error);
