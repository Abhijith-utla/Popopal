"use client"

interface LandingViewProps {
  onGoToUpload: () => void
}

export function LandingView({ onGoToUpload }: LandingViewProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center cursor-pointer relative overflow-hidden"
      onClick={onGoToUpload}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-[#374f6b]/10 rounded-full animate-float-slow"></div>
        <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-[#374f6b]/15 rounded-full animate-float-medium"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-[#374f6b]/8 rounded-full animate-float-fast"></div>
        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-[#374f6b]/12 rounded-full animate-float-slow"></div>
      </div>

      <div className="text-center relative z-10">
        <div className="relative">
          <h1 className="text-8xl md:text-9xl font-bold text-[#374f6b] dark:text-white select-none tracking-wider animate-fade-in-up hover-shadow-title transition-all duration-500 hover:scale-105">
            POPOPAL
          </h1>
        </div>

        <p className="text-lg text-muted-foreground mt-8 animate-fade-in-delayed hover:animate-bounce-subtle">
          Click anywhere to continue
        </p>

        <div className="mt-12 animate-pulse-subtle hover:animate-spin-slow">
          <div className="w-4 h-4 border-r-2 border-b-2 border-[#374f6b]/30 dark:border-white/30 transform rotate-45 mx-auto transition-all duration-300 hover:border-[#374f6b] dark:hover:border-white"></div>
        </div>
      </div>
    </div>
  )
}
