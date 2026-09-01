import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)
const THEME_TRANSITION_DISABLED_CLASS = 'theme-transition-disabled'

interface ThemeProviderProps {
    children: ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

export const ThemeProvider = ({
    children,
    defaultTheme = 'light',
    storageKey = 'theme',
}: ThemeProviderProps) => {
    const transitionFrameRef = useRef<number | null>(null)
    const cleanupFrameRef = useRef<number | null>(null)
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window === 'undefined') return defaultTheme

        const stored = localStorage.getItem(storageKey) as Theme | null
        if (stored === 'light' || stored === 'dark') {
            return stored
        }

        if (defaultTheme === 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark'
        }

        return defaultTheme
    })

    useLayoutEffect(() => {
        const root = document.documentElement
        root.classList.add(THEME_TRANSITION_DISABLED_CLASS)

        if (transitionFrameRef.current !== null) {
            window.cancelAnimationFrame(transitionFrameRef.current)
        }
        if (cleanupFrameRef.current !== null) {
            window.cancelAnimationFrame(cleanupFrameRef.current)
        }

        root.classList.remove('light', 'dark')
        root.classList.add(theme)

        localStorage.setItem(storageKey, theme)

        transitionFrameRef.current = window.requestAnimationFrame(() => {
            cleanupFrameRef.current = window.requestAnimationFrame(() => {
                root.classList.remove(THEME_TRANSITION_DISABLED_CLASS)
                transitionFrameRef.current = null
                cleanupFrameRef.current = null
            })
        })

        return () => {
            if (transitionFrameRef.current !== null) {
                window.cancelAnimationFrame(transitionFrameRef.current)
                transitionFrameRef.current = null
            }
            if (cleanupFrameRef.current !== null) {
                window.cancelAnimationFrame(cleanupFrameRef.current)
                cleanupFrameRef.current = null
            }
            root.classList.remove(THEME_TRANSITION_DISABLED_CLASS)
        }
    }, [theme, storageKey])

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
    }

    const value = {
        theme,
        setTheme,
        toggleTheme,
    }

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
