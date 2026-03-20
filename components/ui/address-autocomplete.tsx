"use client"

import * as React from "react"
import { useRef, useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { MapPin, Loader2 } from "lucide-react"

interface Suggestion {
  description: string
  placeId: string
  mainText: string
  secondaryText: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressCommitted?: (value: string) => void
  onPlaceSelected?: (value: string) => void
  onBoroughDetected?: (borough: string) => void
  onNeighborhoodDetected?: (neighborhood: string) => void
  onTopSuggestionReady?: (suggestion: { description: string; placeId: string } | null) => void
  placeholder?: string
  className?: string
}

const BOROUGH_PATTERNS: Record<string, string[]> = {
  Manhattan: ["Manhattan", "New York, NY"],
  Brooklyn: ["Brooklyn"],
  Queens: ["Queens"],
  Bronx: ["Bronx"],
  "Staten Island": ["Staten Island"],
}

function detectBorough(address: string): string | null {
  for (const [borough, patterns] of Object.entries(BOROUGH_PATTERNS)) {
    if (patterns.some((p) => address.includes(p))) {
      return borough
    }
  }
  return null
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressCommitted,
  onPlaceSelected,
  onBoroughDetected,
  onNeighborhoodDetected,
  onTopSuggestionReady,
  placeholder = "Start typing an address…",
  className,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [fallbackMode, setFallbackMode] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastCommittedAddressRef = useRef("")

  const commitAddress = useCallback(
    (address: string) => {
      const trimmed = address.trim()
      if (!trimmed) return
      if (trimmed === lastCommittedAddressRef.current) return
      lastCommittedAddressRef.current = trimmed
      onAddressCommitted?.(trimmed)
    },
    [onAddressCommitted]
  )

  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      onTopSuggestionReady?.(null)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const res = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(input)}`,
        { signal: controller.signal }
      )
      const data = await res.json()

      if (data.fallback) {
        setFallbackMode(true)
        console.info(
          "Address autocomplete: Google Places API not configured. Using regular text input."
        )
        setSuggestions([])
        setIsOpen(false)
        onTopSuggestionReady?.(null)
        return
      }

      const suggestions = data.suggestions || []
      setSuggestions(suggestions)
      setIsOpen(suggestions.length > 0)
      setActiveIndex(-1)
      // Notify parent of top suggestion for "Is this?" prompt
      onTopSuggestionReady?.(suggestions.length > 0
        ? { description: suggestions[0].description, placeId: suggestions[0].placeId }
        : null
      )
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return
      setSuggestions([])
      setIsOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      onChange(val)

      if (fallbackMode) return

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
    },
    [onChange, fetchSuggestions, fallbackMode]
  )

  const selectSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      onChange(suggestion.description)
      commitAddress(suggestion.description)
      onPlaceSelected?.(suggestion.description)
      setSuggestions([])
      setIsOpen(false)
      setActiveIndex(-1)

      // Fetch place details for borough and neighborhood
      try {
        const res = await fetch(
          `/api/places/autocomplete?placeId=${encodeURIComponent(suggestion.placeId)}`
        )
        const data = await res.json()
        
        if (data.borough && onBoroughDetected) {
          onBoroughDetected(data.borough)
        }
        if (data.neighborhood && onNeighborhoodDetected) {
          onNeighborhoodDetected(data.neighborhood)
        }
      } catch {
        // Fallback to string detection
        const borough = detectBorough(suggestion.description)
        if (borough && onBoroughDetected) {
          onBoroughDetected(borough)
        }
      }
    },
    [onChange, onBoroughDetected, onNeighborhoodDetected, commitAddress]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const hasSuggestions = isOpen && suggestions.length > 0
      if (e.key === "ArrowDown" && hasSuggestions) {
        e.preventDefault()
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === "ArrowUp" && hasSuggestions) {
        e.preventDefault()
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
      } else if (e.key === "Enter" && hasSuggestions && activeIndex >= 0) {
        e.preventDefault()
        selectSuggestion(suggestions[activeIndex])
      } else if (e.key === "Enter") {
        commitAddress(value)
        setIsOpen(false)
        setActiveIndex(-1)
      } else if (e.key === "Escape") {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    },
    [isOpen, suggestions, activeIndex, selectSuggestion, value, commitAddress]
  )

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => commitAddress(value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
          placeholder={placeholder}
          className={cn("h-9 text-sm pr-8", className)}
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MapPin className="h-3.5 w-3.5" />
          )}
        </div>
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md overflow-hidden">
          <ul className="max-h-56 overflow-y-auto py-1">
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.placeId}>
                <button
                  type="button"
                  className={cn(
                    "w-full text-left px-2.5 py-2 text-sm transition-colors",
                    index === activeIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectSuggestion(suggestion)
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <span>
                      <span className="font-medium">
                        {suggestion.mainText}
                      </span>
                      {suggestion.secondaryText && (
                        <span className="text-muted-foreground">
                          {" "}
                          {suggestion.secondaryText}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
