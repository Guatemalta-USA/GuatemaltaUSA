import { PageContents } from "../models";
import {
    collection,
    doc,
    DocumentSnapshot,
    getDoc,
    updateDoc
} from "firebase/firestore";
import { db } from "./firebase";

//Global Firebase Variables
declare const __app_id: string;

/* Functions to map Doc to objects*/
function mapDocToPageContents(docSnap: DocumentSnapshot<any>): PageContents {
    const data = docSnap.data();

    if (!data) {
        throw new Error("No data found in document");
    }
    return new PageContents(
        docSnap.id,
        data.markdown,
        data.lastUpdated
    );
}

export async function getPageContents(pageName: string): Promise<PageContents | null> {
    try {
        const docRef = doc(collection(db, "pages"), pageName);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return mapDocToPageContents(docSnap)
        } else {
            console.warn(`${pageName} not found!`);
            return null;
        }
    } catch (error) {
        console.error("Error fetching page:", error);
        throw new Error("Error loading page contents. Please try reloading the page");
    }
}

export async function updatePageContents(pageName: string, updatedContents: PageContents) {
    try {
        const docRef = doc(collection(db, "pages"), pageName);
    const { pageName: _, ...updateData } = updatedContents;
    await updateDoc(docRef, updateData as any); 
    } catch (error) {
        console.warn("Error updating page contents:", error);
        throw new Error("Error updating page contents. Please reload the page and try again.");
    }
}