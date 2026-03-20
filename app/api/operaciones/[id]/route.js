import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * PATCH /api/operaciones/[id]
 * Body puede contener:
 *   - { status }                         → cambiar estado de la operación
 *   - { notes }                          → editar notas de la operación
 *   - { doc_id, is_completed, doc_notes } → actualizar un documento del checklist
 */
export async function PATCH(request, { params }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { id } = await params

  // Verificar que la operación pertenece al usuario (RLS lo haría también,
  // pero verificamos explícitamente para dar mensajes claros)
  const { data: op, error: opError } = await supabase
    .from('operations')
    .select('id, user_id, status, operation_type')
    .eq('id', id)
    .single()

  if (opError || !op) {
    return NextResponse.json({ error: 'Operación no encontrada' }, { status: 404 })
  }
  if (op.user_id !== user.id) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const body = await request.json()

  // ── Actualizar estado de la operación ──────────────────────────────────────
  if (body.status !== undefined) {
    const { data, error } = await supabase
      .from('operations')
      .update({ status: body.status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ operacion: data })
  }

  // ── Actualizar notas de la operación ───────────────────────────────────────
  if (body.notes !== undefined) {
    const { data, error } = await supabase
      .from('operations')
      .update({ notes: body.notes })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ operacion: data })
  }

  // ── Actualizar documento del checklist ─────────────────────────────────────
  if (body.doc_id !== undefined) {
    const update = {}
    if (body.is_completed !== undefined) {
      update.is_completed = body.is_completed
      update.completed_at = body.is_completed ? new Date().toISOString() : null
    }
    if (body.doc_notes !== undefined) update.notes = body.doc_notes
    if (body.due_date !== undefined)   update.due_date = body.due_date || null

    const { data, error } = await supabase
      .from('operation_documents')
      .update(update)
      .eq('id', body.doc_id)
      .eq('operation_id', id)   // extra seguridad: el doc debe pertenecer a esta op
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ documento: data })
  }

  return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
}
