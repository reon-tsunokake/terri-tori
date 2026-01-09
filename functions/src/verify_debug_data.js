const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'terri-tori'
    });
}

const db = admin.firestore();

async function verifyData() {
    console.log("--- Verifying Firestore Data ---");

    // 1. Check Seasons
    const seasonsSnap = await db.collection('seasons').get();
    console.log(`Found ${seasonsSnap.size} seasons.`);

    for (const doc of seasonsSnap.docs) {
        const seasonData = doc.data();
        console.log(`\nSeason: ${doc.id} (isCurrent: ${seasonData.isCurrent})`);

        // 2. Check Groups for each season
        const groupsSnap = await doc.ref.collection('groups').get();
        console.log(`  - Groups found: ${groupsSnap.size}`);

        for (const groupDoc of groupsSnap.docs) {
            const groupData = groupDoc.data();
            const hasStats = !!groupData.stats;
            const recordCount = groupData.stats?.areaDistribution?.length || 0;
            console.log(`    > Group ${groupDoc.id}: hasStats=${hasStats}, records=${recordCount}`);
            if (hasStats) {
                console.log(`      TotalArea: ${groupData.stats.totalGroupArea}`);
            }
        }
    }
    console.log("\n--- End Verification ---");
}

verifyData().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
