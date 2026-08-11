// Runs every ~5 minutes via GitHub Actions (see .github/workflows/reminders.yml).
// Checks Firestore for tasks that are due and haven't been pushed yet,
// sends a push notification via Firebase Cloud Messaging to every
// registered device (phone + laptop), then marks them as notified.

const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();

async function main(){
  const tasksDoc = await db.collection('aide').doc('tasks').get();
  if(!tasksDoc.exists){
    console.log('No tasks document found yet.');
    return;
  }

  const raw = tasksDoc.data().value;
  let tasks;
  try{ tasks = JSON.parse(raw); }catch(e){
    console.error('Could not parse tasks JSON', e);
    return;
  }

  const now = Date.now();
  const due = tasks.filter(t => !t.done && t.due && !t.notifiedCloud && new Date(t.due).getTime() <= now);

  if(due.length === 0){
    console.log('No due tasks right now.');
    return;
  }

  const devicesSnap = await db.collection('devices').get();
  const tokens = devicesSnap.docs.map(d => d.id);

  if(tokens.length === 0){
    console.log('No registered devices to notify.');
  }

  for(const task of due){
    console.log(`Sending reminder for: ${task.title}`);
    if(tokens.length > 0){
      const message = {
        notification: {
          title: 'Task reminder',
          body: task.title
        },
        tokens
      };
      try{
        const response = await messaging.sendEachForMulticast(message);
        console.log(`Sent to ${response.successCount}/${tokens.length} devices`);
        // Clean up tokens that are no longer valid (app uninstalled, etc.)
        response.responses.forEach((r, i) => {
          if(!r.success && r.error && (r.error.code === 'messaging/registration-token-not-registered')){
            db.collection('devices').doc(tokens[i]).delete().catch(()=>{});
          }
        });
      }catch(e){
        console.error('Failed to send notification', e);
      }
    }
    task.notifiedCloud = true;
  }

  await db.collection('aide').doc('tasks').set({ value: JSON.stringify(tasks), updatedAt: Date.now() });
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
