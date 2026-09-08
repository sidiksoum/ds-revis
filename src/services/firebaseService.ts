import { addDoc, collection, deleteDoc, doc, getDocs, setDoc, updateDoc, getDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, db } from '../firebase'
import type { AppUser, CourseItem, QuizQuestion } from '../types'
import { writeBatch } from 'firebase/firestore'

// Définition des collections
const usersCollection = collection(db, 'users')
const coursesCollection = collection(db, 'courses')
const quizCollection = collection(db, 'quizQuestions')
const yearsCollection = collection(db, 'years')
const filieresCollection = collection(db, 'filieres')

// --- INTERFACES TYPÉES FIRESTORE ---
export interface AcademicYear {
  id: string
  name: string
}

export interface FiliereItem {
  id: string
  name: string
  years?: string[]
}

// Les interfaces suivantes étendent vos types existants pour y inclure l'ID requis par l'UI
export interface FirestoreAppUser extends AppUser {
  id: string
}

export interface FirestoreCourseItem extends CourseItem {
  id: string
}

export interface FirestoreQuizQuestion extends QuizQuestion {
  id: string
}

export interface DailyRegistrationStat {
  date: string
  fullDate: string
  total: number
  premium: number
}

export interface DashboardStats {
  totalUsers: number
  premiumUsers: number
  totalYears: number
  totalFilieres: number
  totalCourses: number
  totalQuizzes: number
  usersByYear: { [key: string]: number }
  usersByFiliere: { [key: string]: number }
  coursesByYear: { [key: string]: number }
  coursesByFiliere: { [key: string]: number }
  usersByCountry: { [key: string]: { total: number; premium: number } }
  usersByAntenne: { [key: string]: { total: number; premium: number } }
  dailyRegistrations: DailyRegistrationStat[]
}

export async function clearPedeagoficalDataOnly() {
  // On liste uniquement les données de cours, classes, filières et quiz
  const collectionsToClear = [
    coursesCollection,
    quizCollection,
    yearsCollection,
    filieresCollection
  ]

  try {
    console.log("Début de la purge des données pédagogiques...")
    
    for (const colRef of collectionsToClear) {
      const snapshot = await getDocs(colRef)
      
      if (!snapshot.empty) {
        const batch = writeBatch(db)
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref)
        })
        await batch.commit()
        console.log(`Collection "${colRef.id}" vidée.`);
      }
    }
    
    console.log("Purge terminée ! La collection 'users' n'a pas été modifiée.")
    await touchDatabaseVersion()
    return true
  } catch (error) {
    console.error("Erreur lors de la suppression des données :", error)
    throw error
  }
}

export async function importPedagogicalData(
  years: { name: string }[],
  filieres: { name: string; years: string[] }[],
  courses: CourseItem[],
  quiz: QuizQuestion[]
) {
  // 1. Purge des anciennes donnees
  await clearPedeagoficalDataOnly();

  // 2. Batches d'insertion
  let batch = writeBatch(db);
  let count = 0;

  for (const y of years) {
    if (count >= 500) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
    const newDocRef = doc(yearsCollection);
    batch.set(newDocRef, y);
    count++;
  }

  for (const f of filieres) {
    if (count >= 500) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
    const newDocRef = doc(filieresCollection);
    batch.set(newDocRef, f);
    count++;
  }

  for (const c of courses) {
    if (count >= 500) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
    const newDocRef = doc(coursesCollection);
    batch.set(newDocRef, c);
    count++;
  }

  for (const q of quiz) {
    if (count >= 500) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
    const newDocRef = doc(quizCollection);
    batch.set(newDocRef, q);
    count++;
  }

  if (count > 0) {
    await batch.commit();
  }

  await touchDatabaseVersion();
}

export async function getDashboardStatistics(): Promise<DashboardStats> {
  const [usersSnap, yearsSnap, filieresSnap, coursesSnap, quizSnap] = await Promise.all([
    getDocs(usersCollection),
    getDocs(yearsCollection),
    getDocs(filieresCollection),
    getDocs(coursesCollection),
    getDocs(quizCollection)
  ])

  const stats: DashboardStats = {
    totalUsers: usersSnap.size,
    premiumUsers: 0,
    totalYears: yearsSnap.size,
    totalFilieres: filieresSnap.size,
    totalCourses: coursesSnap.size,
    totalQuizzes: quizSnap.size,
    usersByYear: {},
    usersByFiliere: {},
    coursesByYear: {},
    coursesByFiliere: {},
    usersByCountry: {},
    usersByAntenne: {},
    dailyRegistrations: []
  }

  // Calculs sur les utilisateurs
  const rawDailyMap: { [dateStr: string]: { total: number; premium: number } } = {}

  usersSnap.forEach((doc) => {
    const data = doc.data()
    const isPremium = data.premium === true
    if (isPremium) stats.premiumUsers++
    
    const year = data.level || 'Non spécifié'
    stats.usersByYear[year] = (stats.usersByYear[year] || 0) + 1

    const filiere = data.filiere || 'Non spécifié'
    stats.usersByFiliere[filiere] = (stats.usersByFiliere[filiere] || 0) + 1

    const country = data.country || 'Non spécifié'
    if (!stats.usersByCountry[country]) {
      stats.usersByCountry[country] = { total: 0, premium: 0 }
    }
    stats.usersByCountry[country].total++
    if (isPremium) stats.usersByCountry[country].premium++

    const antenne = data.antenne || 'Non spécifié'
    if (!stats.usersByAntenne[antenne]) {
      stats.usersByAntenne[antenne] = { total: 0, premium: 0 }
    }
    stats.usersByAntenne[antenne].total++
    if (isPremium) stats.usersByAntenne[antenne].premium++

    // Date d'inscription
    let dateStr = ''
    if (data.createdAt) {
      if (typeof data.createdAt.toDate === 'function') {
        dateStr = data.createdAt.toDate().toISOString().split('T')[0]
      } else if (typeof data.createdAt === 'string') {
        dateStr = data.createdAt.split('T')[0]
      } else if (typeof data.createdAt === 'number') {
        dateStr = new Date(data.createdAt).toISOString().split('T')[0]
      }
    }

    if (!dateStr) {
      const today = new Date().toISOString().split('T')[0]
      dateStr = today
    }

    if (!rawDailyMap[dateStr]) {
      rawDailyMap[dateStr] = { total: 0, premium: 0 }
    }
    rawDailyMap[dateStr].total++
    if (isPremium) rawDailyMap[dateStr].premium++
  })

  // Historique journalier sur les 30 derniers jours
  const dailyList: DailyRegistrationStat[] = []
  const today = new Date()
  const daysToShow = 30

  for (let i = daysToShow - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateKey = d.toISOString().split('T')[0]
    
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const shortLabel = `${day}/${month}`

    const counts = rawDailyMap[dateKey] || { total: 0, premium: 0 }
    dailyList.push({
      date: shortLabel,
      fullDate: dateKey,
      total: counts.total,
      premium: counts.premium
    })
  }

  // Si des inscriptions ont des dates antérieures, les ajouter
  Object.keys(rawDailyMap).forEach((dateKey) => {
    if (!dailyList.some(item => item.fullDate === dateKey)) {
      const parts = dateKey.split('-')
      const shortLabel = parts.length >= 3 ? `${parts[2]}/${parts[1]}` : dateKey
      dailyList.push({
        date: shortLabel,
        fullDate: dateKey,
        total: rawDailyMap[dateKey].total,
        premium: rawDailyMap[dateKey].premium
      })
    }
  })

  dailyList.sort((a, b) => a.fullDate.localeCompare(b.fullDate))
  stats.dailyRegistrations = dailyList

  // Calculs sur les cours
  coursesSnap.forEach((doc) => {
    const data = doc.data()
    const year = data.category || 'Non spécifié'
    stats.coursesByYear[year] = (stats.coursesByYear[year] || 0) + 1

    const filiere = data.filiere || 'Non spécifié'
    stats.coursesByFiliere[filiere] = (stats.coursesByFiliere[filiere] || 0) + 1
  })

  return stats
}

// --- AUTHENTIFICATION & SEED ADMINISTRATEUR ---

export async function seedDefaultAdmin(email: string, password: string) {
  const adminEmail = email.trim().toLowerCase()
  const defaultAdminData = {
    name: 'Super Admin',
    email: adminEmail,
    level: 'Admin',
    filiere: 'Admin',
    premium: true,
    isActive: true,
    role: 'admin',
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, password)
    await setDoc(doc(db, 'users', userCredential.user.uid), defaultAdminData)
    return true
  } catch (error: unknown) {
    const firebaseError = error as { code?: string }

    if (firebaseError.code === 'auth/email-already-in-use') {
      const signedInUser = await signInWithEmailAndPassword(auth, adminEmail, password)
      await setDoc(doc(db, 'users', signedInUser.user.uid), defaultAdminData, { merge: true })
      return true
    }
    throw error
  }
}

export async function signInAdmin(email: string, password: string) {
  const adminEmail = email.trim().toLowerCase()
  const defaultAdminData = {
    name: 'Super Admin',
    email: adminEmail,
    level: 'Admin',
    filiere: 'Admin',
    premium: true,
    isActive: true,
    role: 'admin',
  }

  try {
    return await signInWithEmailAndPassword(auth, adminEmail, password)
  } catch (error: unknown) {
    const firebaseError = error as { code?: string; message?: string }
    console.error('Firebase auth error', firebaseError.code, firebaseError.message)

    if (firebaseError.code === 'auth/configuration-not-found') {
      throw new Error('Firebase Authentication n’est pas configurée pour ce projet. Activez le mode Email/Mot de passe dans Firebase Console, ajoutez le domaine localhost comme domaine autorisé, puis redémarrez l’application.')
    }

    if (firebaseError.code === 'auth/operation-not-allowed') {
      throw new Error('Le mode Email/Mot de passe est désactivé dans Firebase Authentication. Activez-le dans la console Firebase, puis réessayez.')
    }

    const credentialCodes = ['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials', 'auth/wrong-password']

    if (credentialCodes.includes(firebaseError.code ?? '')) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, password)
        await setDoc(doc(db, 'users', userCredential.user.uid), defaultAdminData)
        return await signInWithEmailAndPassword(auth, adminEmail, password)
      } catch (createError: unknown) {
        const createFirebaseError = createError as { code?: string }

        if (createFirebaseError.code === 'auth/email-already-in-use') {
          return await signInWithEmailAndPassword(auth, adminEmail, password)
        }
        throw createError
      }
    }
    throw error
  }
}

export async function signOutAdmin() {
  await signOut(auth)
}

// --- COLLECTION : USERS ---

export async function getUsersFromFirestore(): Promise<FirestoreAppUser[]> {
  const snapshot = await getDocs(usersCollection)
  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      name: data.name || 'Utilisateur sans nom',
      email: data.email || '',
      level: data.level || '',
      filiere: data.filiere || '',
      premium: !!data.premium,
      isActive: !!data.isActive,
      role: data.role || 'user'
    } as FirestoreAppUser
  })
}

export async function updateUser(id: string, updates: Partial<AppUser>) {
  await updateDoc(doc(db, 'users', id), updates)
}

export async function deleteUser(id: string) {
  await deleteDoc(doc(db, 'users', id))
}

// --- COLLECTION : YEARS (CLASSES) ---

export async function addYear(year: string) {
  await addDoc(yearsCollection, { name: year })
  await touchDatabaseVersion()
}

export async function getYearsFromFirestore(): Promise<AcademicYear[]> {
  const snapshot = await getDocs(yearsCollection)
  return snapshot.docs
    .map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data && typeof data.name === 'string' ? data.name : (data.name || 'Classe sans nom')
      }
    })
    .filter(year => year.id !== undefined) 
}

export async function updateYear(id: string, name: string) {
  await updateDoc(doc(db, 'years', id), { name })
  await touchDatabaseVersion()
}

export async function deleteYear(id: string) {
  await deleteDoc(doc(db, 'years', id))
  await touchDatabaseVersion()
}

// --- COLLECTION : FILIERES ---

export async function addFiliere(filiere: string, years: string[] = []) {
  await addDoc(filieresCollection, { name: filiere, years })
  await touchDatabaseVersion()
}

export async function getFilieresFromFirestore(): Promise<FiliereItem[]> {
  const snapshot = await getDocs(filieresCollection)
  return snapshot.docs.map((doc) => {
    const data = doc.data()
    const years = data && Array.isArray(data.years) ? data.years : []
    return {
      id: doc.id,
      years,
      name: data && typeof data.name === 'string' ? data.name : (data.name || 'Filière sans nom')
    }
  })
}

export async function updateFiliere(id: string, name: string, years: string[] = []) {
  await updateDoc(doc(db, 'filieres', id), { name, years })
  await touchDatabaseVersion()
}

export async function deleteFiliere(id: string) {
  await deleteDoc(doc(db, 'filieres', id))
  await touchDatabaseVersion()
}

// --- COLLECTION : COURSES ---

export async function addCourse(course: CourseItem) {
  await addDoc(coursesCollection, course)
  await touchDatabaseVersion()
}

export async function getCoursesFromFirestore(): Promise<FirestoreCourseItem[]> {
  const snapshot = await getDocs(coursesCollection)
  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      title: data.title || 'Cours sans titre',
      category: data.category || '',
      filiere: data.filiere || '',
      summary: data.summary || '',
      driveLink: data.driveLink || '',
      premiumOnly: !!data.premiumOnly
    } as FirestoreCourseItem
  })
}

export async function updateCourse(id: string, updates: Partial<CourseItem>) {
  await updateDoc(doc(db, 'courses', id), updates)
  await touchDatabaseVersion()
}

export async function deleteCourse(id: string) {
  await deleteDoc(doc(db, 'courses', id))
  await touchDatabaseVersion()
}

// --- COLLECTION : QUIZ QUESTIONS ---

export async function addQuizQuestion(question: QuizQuestion) {
  await addDoc(quizCollection, question)
  await touchDatabaseVersion()
}

export async function getQuizQuestionsFromFirestore(): Promise<FirestoreQuizQuestion[]> {
  const snapshot = await getDocs(quizCollection)
  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      courseTitle: data.courseTitle || '',
      subjectLevel: data.subjectLevel || 'Sujet 1',
      subjectTitle: data.subjectTitle || 'Généralités',
      prompt: data.prompt || 'Question sans énoncé',
      type: data.type || 'QCM',
      options: Array.isArray(data.options) ? data.options : [],
      correctAnswer: data.correctAnswer || '',
      explanation: data.explanation || ''
    } as FirestoreQuizQuestion
  })
}

export async function updateQuizQuestion(id: string, updates: Partial<QuizQuestion>) {
  await updateDoc(doc(db, 'quizQuestions', id), updates)
  await touchDatabaseVersion()
}

export async function deleteQuizQuestion(id: string) {
  await deleteDoc(doc(db, 'quizQuestions', id))
  await touchDatabaseVersion()
}

// --- CONFIGURATION DE L'APPLICATION ---
export interface AppSettings {
  whatsappNumber: string
}

const defaultSettings: AppSettings = {
  whatsappNumber: '2250798646697'
}

export async function getAppSettingsFromFirestore(): Promise<AppSettings> {
  const docRef = doc(db, 'settings', 'app')
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const data = docSnap.data()
    return {
      whatsappNumber: data.whatsappNumber || '2250798646697'
    }
  } else {
    await setDoc(docRef, defaultSettings)
    return defaultSettings
  }
}

export async function updateAppSettings(settings: Partial<AppSettings>) {
  const docRef = doc(db, 'settings', 'app')
  await setDoc(docRef, settings, { merge: true })
}

export async function touchDatabaseVersion() {
  try {
    const docRef = doc(db, 'settings', 'app')
    await setDoc(docRef, { lastDatabaseUpdate: new Date().toISOString() }, { merge: true })
  } catch (error) {
    console.error('Error touching database version:', error)
  }
}