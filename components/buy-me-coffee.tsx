"use client"

import { useEffect, useRef } from "react"

export function BuyMeCoffee() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Clean up any existing button
    if (containerRef.current) {
      containerRef.current.innerHTML = ""
    }

    // Create script element
    const script = document.createElement("script")
    script.src = "https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js"
    script.setAttribute("data-name", "bmc-button")
    script.setAttribute("data-slug", "ysakols")
    script.setAttribute("data-color", "#40DCA5")
    script.setAttribute("data-emoji", "")
    script.setAttribute("data-font", "Bree")
    script.setAttribute("data-text", "Buy me a coffee")
    script.setAttribute("data-outline-color", "#000000")
    script.setAttribute("data-font-color", "#ffffff")
    script.setAttribute("data-coffee-color", "#FFDD00")

    // Append script to container
    if (containerRef.current) {
      containerRef.current.appendChild(script)
    }

    // Clean up on unmount
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ""
      }
    }
  }, [])

  return <div ref={containerRef} className="bmc-container fixed bottom-4 right-4 z-50" />
}
