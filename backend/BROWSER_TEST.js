// Quick browser test - paste this into browser console while logged in

(async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    console.log('User:', user.email);
    console.log('Workspace:', user.workspaceId);

    // Get batches
    const batchesRes = await fetch('http://localhost:4010/api/v1/batches', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const batches = await batchesRes.json();
    console.log(`Found ${batches.length} batches`);

    if (batches.length === 0) {
        console.log('❌ No batches found!');
        return;
    }

    const batch = batches[batches.length - 1]; // Last batch
    console.log(`Testing batch: ${batch.name || batch.id}`);

    // Try share
    const shareRes = await fetch(`http://localhost:4010/api/v1/batches/${batch.id}/share`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });

    console.log('Share response status:', shareRes.status);
    const shareData = await shareRes.json();
    console.log('Share data:', shareData);

    if (shareData.shareToken) {
        const url = `${window.location.origin}/share/${shareData.shareToken}`;
        console.log('✅ SUCCESS! Share URL:', url);

        // Copy to clipboard
        await navigator.clipboard.writeText(url);
        console.log('📋 Copied to clipboard!');
    }
})();
