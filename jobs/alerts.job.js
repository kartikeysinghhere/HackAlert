const cron = require('node-cron');
const supabase = require('../config/db');
const resend = require('../config/resend');

const initAlertJobs = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily deadline check...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const { data: hacks } = await supabase.from('hackathons').select('*').eq('registration_deadline', dateStr);

    if (hacks && hacks.length > 0) {
      for (const hack of hacks) {
        const { data: saved } = await supabase.from('saved_hackathons').select('user_email').eq('hackathon_id', hack.id);
        const emails = saved?.map(s => s.user_email) || [];

        if (emails.length > 0 && resend) {
          await resend.emails.send({
            from: 'HackAlert <alerts@hackalert.com>',
            to: emails,
            subject: `Deadline Tomorrow: ${hack.name}`,
            text: `Don't forget! The registration deadline for ${hack.name} is tomorrow (${hack.registration_deadline}).`
          });
        }
      }
    }
  });
};

module.exports = initAlertJobs;
