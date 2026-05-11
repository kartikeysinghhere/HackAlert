const cron = require('node-cron');
const supabase = require('./db');
const { RESEND_API_KEY } = require('./env');
const { Resend } = require('resend');

const resend = new Resend(RESEND_API_KEY);

const initCron = () => {
  cron.schedule('0 10 * * *', async () => {
    console.log('[CRON] Running deadline alert check...');
    if (!RESEND_API_KEY || RESEND_API_KEY === 're_dummy') {
      console.log('[CRON] No RESEND_API_KEY. Skipping.');
      return;
    }

    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const { data: upcoming, error } = await supabase
      .from('saved_hackathons')
      .select('*')
      .gte('hackathon_start', now.toISOString())
      .lte('hackathon_start', in3Days.toISOString());

    if (error || !upcoming?.length) {
      console.log('[CRON] No upcoming deadlines found.');
      return;
    }

    const byUser = {};
    upcoming.forEach(row => {
      if (!byUser[row.user_email]) byUser[row.user_email] = [];
      byUser[row.user_email].push(row);
    });

    for (const [email, hacks] of Object.entries(byUser)) {
      const hackList = hacks.map(h =>
        `<li><strong>${h.hackathon_name}</strong> — starts ${new Date(h.hackathon_start).toLocaleDateString()} — <a href="${h.hackathon_website}">Register →</a></li>`
      ).join('');

      try {
        await resend.emails.send({
          from: 'HackAlert <alerts@yourdomain.com>',
          to: email,
          subject: `⚡ ${hacks.length} hackathon(s) starting in 3 days!`,
          html: `
            <div style="font-family:monospace;background:#0e0e0e;color:#e5e2e1;padding:32px;border-radius:12px;">
              <h2 style="color:#00f0ff;">Hack/Alert ⚡</h2>
              <p>These hackathons you saved are starting soon:</p>
              <ul style="line-height:2;">${hackList}</ul>
              <p style="color:#64748b;font-size:12px;">You saved these on Hack/Alert. Visit your profile to manage saved hackathons.</p>
            </div>
          `
        });
        console.log(`[CRON] Alert sent to ${email}`);
      } catch (e) {
        console.error(`[CRON] Failed to send to ${email}:`, e.message);
      }
    }
  });
};

module.exports = initCron;
