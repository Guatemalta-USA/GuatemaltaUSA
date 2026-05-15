import { PageContents, Post, Project, type Profile } from "../models";
import {
  addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    QueryDocumentSnapshot,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    type FirestoreDataConverter,
    type SnapshotOptions
} from "firebase/firestore";
import { db } from "./firebase";

//Global Firebase Variables
declare const __app_id: string;
const POSTS_PATH = 'posts';

const projectConverter: FirestoreDataConverter<Project> = {
    toFirestore(project: Project) {
        return project.toFirestore();
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Project {
        const data = snapshot.data(options);
        return Project.fromFirestore(snapshot.id, data);
    }
};

const projectsCol = collection(db, 'projects').withConverter(projectConverter);

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w ]+/g, '') // Remove special characters
        .replace(/ +/g, '-');    // Replace spaces with hyphens
}

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

// PAGES
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

export async function addProfile(data: Profile) {
    try {
        const docRef = doc(db, "profiles", data.name);
        await setDoc(docRef, data);
    } catch (error) {
        console.error("Error adding profile: ", error);
        throw new Error("Failed to add profile");
    }
}

// PROFILES
export async function getAllProfiles(): Promise<Profile[]> {
  try {
    const profilesQuery = query(collection(db, "profiles"), orderBy("name", "asc"));
    const querySnapshot = await getDocs(profilesQuery);

    const profiles: Profile[] = querySnapshot.docs.map(doc => ({
      ...doc.data()
    } as Profile));

    return profiles;
  } catch (error) {
    console.error("Error fetching all profiles: ", error);
    throw new Error("Failed to fetch profiles");
  }
}

export async function getProfilesByCountry(countryName: string): Promise<Profile[]> {
  try {
    const profilesQuery = query(
      collection(db, "profiles"),
      where("country", "==", countryName),
      orderBy("name", "asc")
    );

    const querySnapshot = await getDocs(profilesQuery);

    const profiles: Profile[] = querySnapshot.docs.map(doc => ({
      ...doc.data()
    } as Profile));

    return profiles;
  } catch (error) {
    console.error(`Error fetching profiles for ${countryName}: `, error);
    throw new Error("Failed to fetch profiles by country");
  }
}

export async function updateProfile(name: string, updates: Partial<Profile>) {
  try {
    const docRef = doc(db, "profiles", name);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error("Error updating profile: ", error);
    throw new Error("Failed to update profile");
  }
}

export async function deleteProfile(name: string) {
  try {
    const docRef = doc(db, "profiles", name);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting profile: ", error);
    throw new Error("Failed to delete profile");
  }
}

//POSTS
export async function getAllPosts(): Promise<Post[]> {
    const q = query(collection(db, "posts"), orderBy("publishDate", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => Post.fromFirestore(doc.id, doc.data()));
}

export async function savePost(post: Post): Promise<string> {
    // If the post already has an ID (e.g., editing an existing post)
    if (post.id) {
        const docRef = doc(db, POSTS_PATH, post.id);
        await updateDoc(docRef, post.toFirestore());
        return post.id;
    } 
    
    // For NEW posts: generate ID from title
    const customId = slugify(post.postTitle);
    const docRef = doc(db, POSTS_PATH, customId);
    
    // We use setDoc because we are specifying the ID manually
    await setDoc(docRef, post.toFirestore());
    
    return customId;
}

export async function getPostById(id: string): Promise<Post | null> {
    const docRef = doc(db, "posts", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return Post.fromFirestore(docSnap.id, docSnap.data());
    }
    return null;
}

export async function deletePost(postId: string): Promise<void> {
    try {
        const postRef = doc(db, "posts", postId);
        await deleteDoc(postRef);
        
        console.log(`Firestore: Post ${postId} successfully deleted.`);
    } catch (error) {
        console.error("Error deleting post from Firestore:", error);
        throw new Error("Could not delete post. Please check permissions.");
    }
}

// PROJECTS
export async function getProjectsByStatus(isCurrent: boolean): Promise<Project[]> {
    const q = query(projectsCol, where("currentProject", "==", isCurrent));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
}

export async function getProjectById(id: string): Promise<Project | null> {
    const docRef = doc(db, 'projects', id).withConverter(projectConverter);
    const docSnap = await getDoc(docRef);
    
    return docSnap.exists() ? docSnap.data() : null;
}

export async function saveProject(project: Project): Promise<string> {
    if (project.id) {
        // Update existing
        const docRef = doc(db, 'projects', project.id).withConverter(projectConverter);
        await setDoc(docRef, project);
        return project.id;
    } else {
        // Create new
        const customId = slugify(project.projectTitle);
        const docRef = doc(db, 'projects', customId);
        await setDoc(docRef, project.toFirestore());
        return customId;
    }
}

export async function deleteProject(id: string): Promise<void> {
    const docRef = doc(db, 'projects', id);
    await deleteDoc(docRef);
}