export type MenuKey = 'overview' | 'users' | 'classes' | 'filieres' | 'courses' | 'quiz'

export interface CourseItem {
  id?: string
  title: string
  category: string
  filiere: string
  summary: string
  driveLink: string
  premiumOnly: boolean
}

export interface QuizQuestion {
  id?: string
  courseTitle: string
  subjectLevel: string
  subjectTitle: string
  prompt: string
  type: 'QCM' | 'QCD'
  options: string[]
  correctAnswer: string
  explanation: string
}

export interface UserProgressItem {
  label: string
  value: number
  subtitle: string
}

export interface AppUser {
  id?: string
  name: string
  email: string
  level: string
  filiere: string
  premium: boolean
  isActive: boolean
  role?: string
}
