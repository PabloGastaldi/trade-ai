import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_STATUSES = [
  'expo_preparacion', 'expo_documentacion', 'expo_docs_completos', 'expo_oficializado',
  'expo_verificacion', 'expo_embarcado', 'expo_cobro_pendiente', 'expo_cerrada',
  'impo_orden_compra', 'impo_en_transito', 'impo_arribada', 'impo_despacho_proceso',
  'impo_oficializado', 'impo_verificacion', 'impo_librada', 'impo_pago_pendiente', 'impo_cerrada',
]

/**
 * PATCH /api/operaciones/[id]
 * Body puede contener:
 *   - { status }                         → cambiar estado de la operación
 *   - { notes }                          → editar notas de la operación
 *   - { doc_id, is_completed, doc_notes } → actualizar un documento del checklist
 */
export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await params
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

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
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
      }
      const { data, error } = await supabase
        .from('operations')
        .update({ status: body.status })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('[operaciones] Error al actualizar estado:', error.message)
        return NextResponse.json({ error: 'Error al actualizar la operación' }, { status: 500 })
      }
      return NextResponse.json({ operacion: data })
    }

    // ── Actualizar notas de la operación ───────────────────────────────────────
    if (body.notes !== undefined) {
      if (typeof body.notes !== 'string') {
        return NextResponse.json({ error: 'Notas inválidas' }, { status: 400 })
      }
      const { data, error } = await supabase
        .from('operations')
        .update({ notes: body.notes })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('[operaciones] Error al actualizar notas:', error.message)
        return NextResponse.json({ error: 'Error al actualizar la operación' }, { status: 500 })
      }
      return NextResponse.json({ operacion: data })
    }

    // ── Actualizar documento del checklist ─────────────────────────────────────
    if (body.doc_id !== undefined) {
      if (typeof body.doc_id !== 'string' || body.doc_id.trim() === '') {
        return NextResponse.json({ error: 'doc_id inválido' }, { status: 400 })
      }
      const update = {}
      if (body.is_completed !== undefined) {
        update.is_completed = Boolean(body.is_completed)
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
        console.error('[operaciones] Error al actualizar documento:', error.message)
        return NextResponse.json({ error: 'Error al actualizar el documento' }, { status: 500 })
      }
      return NextResponse.json({ documento: data })
    }

    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  } catch (err) {
    console.error('[operaciones/id] Error inesperado en PATCH:', err?.message)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE /api/operaciones/[id]
export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await params
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const { data: op, error: opError } = await supabase
      .from('operations')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (opError || !op) {
      return NextResponse.json({ error: 'Operación no encontrada' }, { status: 404 })
    }
    if (op.user_id !== user.id) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { error } = await supabase
      .from('operations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[operaciones] Error al eliminar:', error.message)
      return NextResponse.json({ error: 'Error al eliminar la operación' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[operaciones/id] Error inesperado en DELETE:', err?.message)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
