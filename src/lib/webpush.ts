import webpush from 'web-push';

export const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BOdki05aX2efrDBp26eEukkajIgApnDb8B-lJBZJ97lFl4kImpq0M03RWUZwk8YKOaVpBHgvwcRLWHVJQliGx_8';

export const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'YeCE-xlJw54EbkhWZ8QTqKmeTJhET0jtiCPBNl37eZo';

const email = process.env.VAPID_SUBJECT || 'mailto:admin@erp.local';

// Initialize web-push
webpush.setVapidDetails(email, publicVapidKey, privateVapidKey);

export default webpush;
