import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown } from 'lucide-react'

export type AdminSelectOption = { value: string; label: string; avatar?: string; color?: string }

type Props = {
  value: string
  options: AdminSelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
  disabled?: boolean
}

export function AdminSelect({ value, options, onChange, ariaLabel, className = '', disabled = false }: Props) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.findIndex(option => option.value === value)))
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const selected = options.find(option => option.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    optionRefs.current[activeIndex]?.focus()
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open, activeIndex])

  const openMenu = (index = options.findIndex(option => option.value === value)) => {
    setActiveIndex(Math.max(0, index))
    setOpen(true)
  }

  const choose = (option: AdminSelectOption) => {
    onChange(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const moveActive = (index: number) => {
    const next = Math.max(0, Math.min(options.length - 1, index))
    setActiveIndex(next)
    optionRefs.current[next]?.focus()
  }

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu(event.key === 'ArrowDown' ? Math.max(0, options.findIndex(option => option.value === value)) : Math.max(0, options.findIndex(option => option.value === value)))
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      open ? choose(options[activeIndex]) : openMenu()
    }
  }

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(activeIndex + 1) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(activeIndex - 1) }
    else if (event.key === 'Home') { event.preventDefault(); moveActive(0) }
    else if (event.key === 'End') { event.preventDefault(); moveActive(options.length - 1) }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(options[activeIndex]) }
    else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus() }
    else if (event.key === 'Tab') setOpen(false)
  }

  return <div ref={rootRef} className={`admin-select ${className}`}>
    <button ref={triggerRef} type="button" className="admin-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => open ? setOpen(false) : openMenu()} onKeyDown={onTriggerKeyDown}>
      {selected?.color && <span className="admin-select-dot" style={{ background: selected.color }}/>}
      {selected?.avatar && <img className="admin-select-avatar admin-select-avatar--trigger" src={selected.avatar} alt=""/>}
      <span>{selected?.label ?? ''}</span>
      <ChevronDown size={15} aria-hidden="true"/>
    </button>
    {open && <div className="admin-select-menu" role="listbox" aria-label={ariaLabel} onKeyDown={onMenuKeyDown}>
      {options.map((option, index) => (
        <button ref={element => { optionRefs.current[index] = element }} key={option.value} type="button" role="option" aria-selected={option.value === value} tabIndex={index === activeIndex ? 0 : -1} className={`admin-select-option${option.value === value ? ' selected' : ''}${index === activeIndex ? ' active' : ''}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(option)}>
          {option.color && <span className="admin-select-dot" style={{ background: option.color }}/>}
          {option.avatar && <img className="admin-select-avatar" src={option.avatar} alt=""/>}
          <span>{option.label}</span>
        </button>
      ))}
    </div>}
  </div>
}
