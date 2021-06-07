import * as functions from "firebase-functions";
import axios from "axios";
import { CENTER_RESPONSE, FIRESTORE_ALERT } from "./models/centerResponse";
import admin = require("firebase-admin");
require('dotenv').config()
import { sendBulkTextMessage } from "./twilio/twilioService";
admin.initializeApp();
const getIfSlotExists = (data: CENTER_RESPONSE, age: number) => {
    const centerWithSessions = data.centers
        ?.map((center) => {
            const sessions = center.sessions?.filter(
                (session) =>
                    session.available_capacity &&
                    session.available_capacity > 0 &&
                    age >= session.min_age_limit
            );
            if (sessions?.length) {
                return {
                    ...center,
                    sessions: sessions,
                };
            } else return null;
        })
        .filter((center) => center);
    return centerWithSessions;
};


const getAvailableSlots = async (districtId: number, age: number) => {
    const today = new Date();
    const formattedDate = `${("0" + today.getDate()).slice(-2)}-${(
        "0" +
        (today.getMonth() + 1)
    ).slice(-2)}-${today.getFullYear()}`;
    const url = "https://4fuo6ouu67.execute-api.ap-south-1.amazonaws.com/default/getSlot";
    const response = await axios.get(url, {
        params: {
            district_id: districtId,
            formatDate: formattedDate,
        },
    });
    const centerWithSessions = getIfSlotExists(response.data, age);
    return centerWithSessions;
};

export const scheduledFunction = functions.pubsub.schedule("*/15  * * * *").onRun(async () => { // eslint-disable-line
    console.log("-scheduler started at -", (new Date().toLocaleString()));
    const db = admin.firestore();
    const cronArray = await getCronJobData();
    console.log(cronArray.length);
    const jobs: Promise<any>[] = [];
    cronArray.forEach((data) => {
        const { alert, mobile_numbers, idArr } = data;
        const job = getAvailableSlots(alert.district_id, alert.age_category).then((data) => {// eslint-disable-line
            if (data && data.length) {
                console.log("-inside slots");
                console.log(`Vaccination slot is available in ${alert.district_name}, ${alert.state_name} for age ${alert.age_category}`);// eslint-disable-line
                const text = `Vaccination slot is available in ${alert.district_name}, ${alert.state_name} for age ${alert.age_category}`;
                console.log(JSON.stringify(mobile_numbers));
                const filtered_numbers = mobile_numbers.filter(number => number.length)
                if (filtered_numbers.length) sendBulkTextMessage(text, filtered_numbers)
                idArr.forEach(async (id) => {
                    const docRef = db.collection("users").doc(id);
                    const documents = (await db.collection("users").doc(id).get()).data();// eslint-disable-line
                    const alertArray: FIRESTORE_ALERT[] = documents ? documents["alert"] : [];// eslint-disable-line
                    console.log(JSON.stringify(alertArray));
                    if (alertArray && alertArray.length) {
                        const found = alertArray.find((alerts) => (alerts.age_category === alert.age_category && alerts.district_id === alert.district_id));
                        if (found) {
                            found.date_updated = new Date().toISOString();
                            found.available = true;
                            const restArray = alertArray.filter((alerts) => !(alerts.age_category === alert.age_category && alerts.district_id === alert.district_id))
                            await docRef.update({
                                alert: [...restArray, found],// eslint-disable-line
                            });
                        }
                    }
                });

            }
        }).catch(() => console.log("ran into err"));
        jobs.push(job);
    });
    return await Promise.all(jobs);
});


//----------------------------------------- Mobile --------------------------------

// export const scheduledFunction = functions.pubsub.schedule("*/15  * * * *").onRun(async () => { // eslint-disable-line
//     console.log("-scheduler started at -", (new Date().toLocaleString()));
//     const db = admin.firestore();
//     const cronArray = await getCronJobData();
//     console.log(cronArray.length);
//     const jobs: Promise<any>[] = [];
//     cronArray.forEach((data) => {
//         const { alert, fcmTokens, idArr } = data;
//         const job = getAvailableSlots(alert.district_id, alert.age_category).then((data) => {// eslint-disable-line
//             if (data && data.length) {
//                 console.log("-inside slots");
//                 console.log(`Vaccination slot is available in ${alert.district_name}, ${alert.state_name} for age ${alert.age_category}`);// eslint-disable-line
//                 admin.messaging().sendMulticast({
//                     tokens: fcmTokens,
//                     notification: {
//                         title: "Vaccination Slot Update",
//                         body: `Vaccination slot is available in ${alert.district_name}, ${alert.state_name} for age ${alert.age_category}`,// eslint-disable-line
//                     },
//                 }).then(() => {
//                     idArr.forEach(async (id) => {
//                         const docRef = db.collection("users").doc(id);
//                         const documents = (await db.collection("users").doc(id).get()).data();// eslint-disable-line
//                         const alertArray: FIRESTORE_ALERT[] = documents ? documents["alert"] : [];// eslint-disable-line
//                         console.log(JSON.stringify(alertArray));
//                         if (alertArray && alertArray.length) {
//                             await docRef.update({
//                                 alert: alertArray.filter((alerts) => !(alerts.age_category === alert.age_category && alerts.district_id === alert.district_id)),// eslint-disable-line
//                             });
//                         }
//                     });
//                 });
//             }
//         }).catch(() => console.log("ran into err"));
//         jobs.push(job);
//     });
//     return await Promise.all(jobs);
// });

// const getCronJobData = async () => {
//     const db = admin.firestore();
//     const query = await db.collection("users").get();
//     const arr: Array<{
//         alert: Array<FIRESTORE_ALERT>,
//         fcmToken: string,
//         id: string,
//     }> = [];
//     query.forEach((snapshot) => {
//         const { alert, fcmToken } = snapshot.data();
//         arr.push({
//             alert,
//             fcmToken: fcmToken || "",
//             id: snapshot.id,
//         });
//     });

//     const filteredArray: Array<{
//         alert: FIRESTORE_ALERT,
//         fcmTokens: Array<string>,
//         idArr: Array<string>
//     }> = [];
//     arr.forEach((unfilteredData) => {
//         unfilteredData.alert.forEach((unfilteredAlert) => {
//             const foundData = filteredArray.find((filtered) => (filtered.alert.district_id === unfilteredAlert.district_id && filtered.alert.age_category === unfilteredAlert.age_category));// eslint-disable-line
//             if (foundData) {
//                 foundData.fcmTokens.push(unfilteredData.fcmToken);
//                 foundData.idArr.push(unfilteredData.id);
//             } else {
//                 filteredArray.push({
//                     alert: unfilteredAlert,
//                     fcmTokens: [unfilteredData.fcmToken],
//                     idArr: [unfilteredData.id],
//                 });
//             }
//         });
//     });
//     return filteredArray;
// };
//----------------------------------------- Mobile - end --------------------------------


const getCronJobData = async () => {
    const db = admin.firestore();
    const query = await db.collection("users").get();
    const arr: Array<{
        alert: Array<FIRESTORE_ALERT>,
        mobile_number: string,
        id: string,
    }> = [];
    query.forEach((snapshot) => {
        const { alert, mobile_number } = snapshot.data();
        arr.push({
            alert: alert.filter((data: FIRESTORE_ALERT) => !data.available),
            mobile_number: mobile_number || "",
            id: snapshot.id,
        });
    });

    const filteredArray: Array<{
        alert: FIRESTORE_ALERT,
        mobile_numbers: Array<string>,
        idArr: Array<string>
    }> = [];
    arr.forEach((unfilteredData) => {
        unfilteredData.alert.forEach((unfilteredAlert) => {
            const foundData = filteredArray.find((filtered) => (filtered.alert.district_id === unfilteredAlert.district_id && filtered.alert.age_category === unfilteredAlert.age_category));// eslint-disable-line
            if (foundData) {
                foundData.mobile_numbers.push(unfilteredData.mobile_number);
                foundData.idArr.push(unfilteredData.id);
            } else {
                filteredArray.push({
                    alert: unfilteredAlert,
                    mobile_numbers: [unfilteredData.mobile_number],
                    idArr: [unfilteredData.id],
                });
            }
        });
    });
    return filteredArray;
};


export const insertData = functions.https.onRequest(async (req, res) => {
    const db = admin.firestore();
    const snapshot = db.collection("users").doc("+917020476195");
    await snapshot.update({
        alert: [{
            age_category: 18, district_id: 151, district_name: "North Goa", state_id: 10, state_name: "Goa",// eslint-disable-line
        }, {
            age_category: 45, district_id: 151, district_name: "North Goa", state_id: 10, state_name: "Goa",// eslint-disable-line
        }],
    });
    res.send();
});