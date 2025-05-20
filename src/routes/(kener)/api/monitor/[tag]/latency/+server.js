import { json } from '@sveltejs/kit';
import db from '$lib/server/db/db.js';
import { GetMinuteStartNowTimestampUTC } from '$lib/server/tool.js';

export async function GET({ params }) {
    const tag = params.tag;
    const now = GetMinuteStartNowTimestampUTC();
    const start = now - (24 * 60 * 60); // Last 24 hours
    
    try {
        const data = await db.getMonitoringDataByMonitorTag(tag, start, now);
        const formattedData = {};
        
        // Format data for the chart
        data.forEach(entry => {
            formattedData[entry.timestamp] = {
                latency: entry.latency,
                status: entry.status
            };
        });
        
        return json(formattedData);
    } catch (error) {
        console.error('Error fetching latency data:', error);
        return json({ error: 'Failed to fetch latency data' }, { status: 500 });
    }
} 