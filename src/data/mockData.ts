import type { AppUser, CourseItem, QuizQuestion, UserProgressItem } from '../types'

export const initialClasses = ['Licence 1', 'Licence 2', 'Licence 3', 'AS L1', 'AS L2']
export const initialFilieres = ['IDE', 'SF', 'AS']

export const globalUsers: AppUser[] = [
  {
    name: 'Amina Diop',
    email: 'amina@infas.sn',
    level: 'Licence 2',
    filiere: 'IDE',
    premium: false,
    isActive: true,
  },
  {
    name: 'Moussa Fall',
    email: 'moussa@infas.sn',
    level: 'Licence 1',
    filiere: 'SF',
    premium: true,
    isActive: true,
  },
  {
    name: 'Sophie Mbaye',
    email: 'sophie@infas.sn',
    level: 'Licence 3',
    filiere: 'IDE',
    premium: false,
    isActive: false,
  },
]

export const globalCourses: CourseItem[] = [
  {
    title: 'Anatomie - Physiologie',
    category: 'Licence 1',
    filiere: 'IDE',
    summary: 'Introduction générale au corps humain, structures osseuses, musculaires et systèmes organiques de base.',
    driveLink: 'https://drive.google.com/file/d/1_anatomie_physiologie_pdf/view',
    premiumOnly: false,
  },
  {
    title: 'Santé Infantile & Pédiatrie',
    category: 'Licence 1',
    filiere: 'SF',
    summary: 'Bases théoriques des soins aux enfants de moins de 5 ans, alimentation et surveillance de la croissance.',
    driveLink: 'https://drive.google.com/file/d/2_sante_infantile_pdf/view',
    premiumOnly: false,
  },
  {
    title: 'Pharmacologie Spécialisée',
    category: 'Licence 2',
    filiere: 'IDE',
    summary: 'Étude des grandes classes de médicaments, calcul de doses et surveillance des effets secondaires.',
    driveLink: 'https://drive.google.com/file/d/5_pharmacologie_pdf/view',
    premiumOnly: true,
  },
  {
    title: 'Soins Obstétricaux de Base (CPN)',
    category: 'Licence 2',
    filiere: 'SF',
    summary: 'Déroulement d’une consultation prénatale et éducation sur les signes de danger.',
    driveLink: 'https://drive.google.com/file/d/8_cpn_base_pdf/view',
    premiumOnly: false,
  },
  {
    title: 'Gestion et Management des Services',
    category: 'Licence 3',
    filiere: 'IDE',
    summary: 'Organisation d’un service de soins, gestion des plannings infirmiers et leadership clinique.',
    driveLink: 'https://drive.google.com/file/d/9_management_ide_pdf/view',
    premiumOnly: true,
  },
  {
    title: 'Techniques de Soins de Base',
    category: 'AS L1',
    filiere: 'AS',
    summary: 'Prise des constantes vitales, réfection de lit et manutention de base.',
    driveLink: 'https://drive.google.com/file/d/11_soins_base_as_pdf/view',
    premiumOnly: false,
  },
  {
    title: 'Santé de la Reproduction & PMI',
    category: 'AS L2',
    filiere: 'AS',
    summary: 'Rôle de l’auxiliaire de santé en PMI, pesée des nourrissons et planification familiale.',
    driveLink: 'https://drive.google.com/file/d/12_pmi_as_pdf/view',
    premiumOnly: true,
  },
]

export const globalQuizQuestions: QuizQuestion[] = [
  {
    id: '1',
    courseTitle: 'Anatomie - Physiologie',
    subjectLevel: 'Sujet 1',
    subjectTitle: 'Généralités',
    prompt: 'Quelle est la valeur normale de la glycémie à jeun chez l’adulte ?',
    type: 'QCM',
    options: ['0,70 à 1,10 g/L', '1,10 à 1,40 g/L', '1,40 à 1,80 g/L', '0,50 à 0,70 g/L'],
    correctAnswer: '0,70 à 1,10 g/L',
    explanation: 'La glycémie normale à jeun chez l’adulte se situe entre 0,70 et 1,10 g/L.',
  },
  {
    id: '2',
    courseTitle: 'Soins Obstétricaux de Base (CPN)',
    subjectLevel: 'Sujet 1',
    subjectTitle: 'Généralités',
    prompt: 'Le signe de Chadwick est un signe de grossesse ?',
    type: 'QCD',
    options: ['Vrai', 'Faux'],
    correctAnswer: 'Vrai',
    explanation: 'Le signe de Chadwick décrit la coloration bleuâtre du col de l’utérus.',
  },
  {
    id: '3',
    courseTitle: 'Pharmacologie Spécialisée',
    subjectLevel: 'Sujet 1',
    subjectTitle: 'Généralités',
    prompt: 'Quel muscle est le site privilégié pour une injection intramusculaire chez le nourrisson ?',
    type: 'QCM',
    options: ['Grand fessier', 'Deltoïde', 'Vaste externe', 'Biceps'],
    correctAnswer: 'Vaste externe',
    explanation: 'Le vaste externe est privilégié chez le nourrisson pour éviter les complications.',
  },
]

export const getSampleProgressItems = (): UserProgressItem[] => [
  {
    label: 'Quiz Validés',
    value: 0.8,
    subtitle: '4 quiz réussis sur 5 tentés',
  },
  {
    label: 'Fiches de Cours lues',
    value: 0.6,
    subtitle: '7 fiches lues sur 12 fiches disponibles',
  },
  {
    label: 'Séances de révision hebdomadaires',
    value: 0.75,
    subtitle: '6 jours actifs cette semaine',
  },
]
