import { createClient } from '@/lib/supabase/server'

// DELETE /api/historial/:id — soft delete de una consulta del historial
export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await params
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return Response.json({ error: 'ID inválido' }, { status: 400 })
    }

    // Soft delete — solo marca como eliminado si le pertenece al usuario
    const { error } = await supabase
      .from('queries_log')
      .update({ deleted: true })
      .eq('id', id)
      .eq('user_id', user.id) // seguridad: solo sus propias consultas

    if (error) {
      console.error('[historial] Error borrando consulta:', error.message)
      return Response.json({ error: 'Error al eliminar' }, { status: 500 })
    }

    return Response.json({ ok: true })
  } catch (err) {
    console.error('[historial] Error inesperado:', err?.message)
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
