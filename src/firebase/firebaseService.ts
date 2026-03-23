import { PageContents } from "../models";
import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc
} from "firebase/firestore";
import { db } from "./firebase";

//Global Firebase Variables
declare const __app_id: string;

export async function addPage(pageData: PageContents): Promise<void> {
    try {
        const docRef = doc(db, "pages", pageData.pageName);
        await setDoc(docRef, pageData);
        console.log(`Page "${pageData.pageName}" created successfully.`);
    } catch (error) {
        console.error("Error adding page:", error);
        throw new Error("Failed to create the page.");
    }
}

export async function getPageContents(pageName: string): Promise<PageContents | null> {
    try {
        const docRef = doc(db, "pages", pageName);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as PageContents;
        } else {
            console.warn(`Page "${pageName}" not found!`);
            return null;
        }
    } catch (error) {
        console.error("Error fetching page:", error);
        throw new Error("Could not load page contents.");
    }
}

export async function updatePageContents(pageName: string, updates: Partial<PageContents>): Promise<void> {
    const docRef = doc(db, "pages", pageName);
    
    await setDoc(docRef, { 
        ...updates, 
        pageName: pageName,
        lastUpdated: serverTimestamp() 
    }, { merge: true });
}