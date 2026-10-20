import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Pencil, Plus, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  opciones: string[]
  onChange: (opciones: string[]) => void
  placeholder?: string
}

export function OpcionesEditor({ opciones, onChange, placeholder = 'Nueva opción…' }: Props) {
  const [input, setInput] = useState('')
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  function add() {
    const v = input.trim()
    if (!v || opciones.some(o => o.toLowerCase() === v.toLowerCase())) return
    onChange([...opciones, v])
    setInput('')
  }

  function remove(index: number) {
    onChange(opciones.filter((_, i) => i !== index))
    if (editIndex === index) setEditIndex(null)
  }

  function startEdit(index: number) {
    setEditIndex(index)
    setEditValue(opciones[index])
  }

  function saveEdit() {
    if (editIndex == null) return
    const v = editValue.trim()
    if (!v) return
    const duplicate = opciones.some(
      (o, i) => i !== editIndex && o.toLowerCase() === v.toLowerCase()
    )
    if (duplicate) return
    onChange(opciones.map((o, i) => (i === editIndex ? v : o)))
    setEditIndex(null)
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= opciones.length) return
    const next = [...opciones]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
    if (editIndex === index) setEditIndex(target)
    else if (editIndex === target) setEditIndex(index)
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-muted-foreground font-medium">Opciones válidas</p>

      {opciones.length > 0 && (
        <div className="space-y-1">
          {opciones.map((op, i) => (
            <div key={i} className="group flex items-center gap-1">
              {editIndex === i ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <Input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); saveEdit() }
                      if (e.key === 'Escape') setEditIndex(null)
                    }}
                    className="h-6 text-xs flex-1"
                    maxLength={100}
                    autoFocus
                  />
                  <Button type="button" size="icon" variant="ghost" className="h-5 w-5 shrink-0"
                    onClick={saveEdit}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-5 w-5 shrink-0"
                    onClick={() => setEditIndex(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <Badge variant="secondary" className="text-xs gap-1 cursor-default">
                    {op}
                  </Badge>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" className="text-muted-foreground hover:text-foreground p-0.5"
                      onClick={() => startEdit(i)} title="Editar">
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                    {opciones.length > 1 && (
                      <>
                        <button type="button" className="text-muted-foreground hover:text-foreground p-0.5 disabled:opacity-30"
                          onClick={() => move(i, -1)} disabled={i === 0} title="Subir">
                          <ArrowUp className="h-2.5 w-2.5" />
                        </button>
                        <button type="button" className="text-muted-foreground hover:text-foreground p-0.5 disabled:opacity-30"
                          onClick={() => move(i, 1)} disabled={i === opciones.length - 1} title="Bajar">
                          <ArrowDown className="h-2.5 w-2.5" />
                        </button>
                      </>
                    )}
                    <button type="button" className="text-muted-foreground hover:text-destructive p-0.5"
                      onClick={() => remove(i)} title="Eliminar">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1">
        <Input
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); add() }
          }}
          className="h-7 text-xs flex-1"
          maxLength={100}
        />
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 shrink-0" onClick={add}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
