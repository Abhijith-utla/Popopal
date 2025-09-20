"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark)

    setIsDark(shouldBeDark)
    document.documentElement.classList.toggle("dark", shouldBeDark)
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    document.documentElement.classList.toggle("dark", newTheme)
    localStorage.setItem("theme", newTheme ? "dark" : "light")
  }

  return (
    <Button
      onClick={toggleTheme}
      size="icon"
      variant="outline"
      className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm border-[#374f6b]/20 hover:bg-[#374f6b]/10 transition-all duration-300 shadow-lg"
    >
      {isDark ? <Sun className="h-5 w-5 text-[#374f6b]" /> : <Moon className="h-5 w-5 text-[#374f6b]" />}
    </Button>
  )
}
