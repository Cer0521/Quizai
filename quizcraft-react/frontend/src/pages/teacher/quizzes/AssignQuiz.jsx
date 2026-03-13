import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '../../../components/AppLayout'
import api from '../../../api'

export default function AssignQuiz() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [students, setStudents] = useState([])
  const [selected, setSelected] = useState([])
  const [dueDate, setDueDate] = useState('')
  const [search, setSearch] = useState('')
  const [alreadyAssigned, setAlreadyAssigned] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    Promise.all([
      api.get(`/quizzes/${id}`),
      api.get('/students'),
      api.get('/assignments')
    ]).then(([q, s, a]) => {
      setQuiz(q.data.quiz)
      setStudents(s.data.students)
      const assigned = a.data.assignments.filter(x => x.quiz_id === parseInt(id)).map(x => x.student_id)
      setAlreadyAssigned(assigned)
    }).finally(() => setLoading(false))
  }, [id])

  function toggleStudent(sid) {
    setSelected(prev => prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid])
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAssign() {
    if (!selected.length) return
    setSaving(true)
    try {
      await api.post('/assignments', { quiz_id: parseInt(id), student_ids: selected, due_date: dueDate || null })
      setSuccess(`Assigned to ${selected.length} student(s) successfully!`)
      setAlreadyAssigned(prev => [...prev, ...selected])
      setSelected([])
    } catch (err) {
      alert(err.response?.data?.message || 'Assignment failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <AppLayout><div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" /></div></AppLayout>

  return (
    <AppLayout header={<h2 className="text-xl font-bold text-gray-800">Assign Quiz to Students</h2>}>
      <div className="max-w-xl mx-auto space-y-5">
        {success && <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg text-sm">{success}</div>}

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-1">{quiz?.title}</h3>
          <p className="text-sm text-gray-400">{quiz?.total_questions} questions</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (optional)</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500" />
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">Select Students</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:border-red-500 focus:ring-1 focus:ring-red-500" />

          {students.length === 0
            ? <p className="text-sm text-gray-400 text-center py-4">No students registered yet.</p>
            : <div className="space-y-2 max-h-64 overflow-y-auto">
                {filtered.map(s => {
                  const isAssigned = alreadyAssigned.includes(s.id)
                  const isSelected = selected.includes(s.id)
                  return (
                    <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      isAssigned ? 'bg-gray-50 opacity-50 cursor-not-allowed' : isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="checkbox" disabled={isAssigned} checked={isSelected || isAssigned}
                        onChange={() => !isAssigned && toggleStudent(s.id)} className="text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </div>
                      {isAssigned && <span className="text-xs text-gray-400">Already assigned</span>}
                    </label>
                  )
                })}
              </div>
          }
          <p className="text-xs text-gray-400 mt-2">{selected.length} selected</p>
        </div>

        <div className="flex justify-between">
          <button onClick={() => navigate(`/teacher/quizzes/${id}/edit`)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">← Back</button>
          <button onClick={handleAssign} disabled={saving || !selected.length}
            className="px-5 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
            {saving ? 'Assigning...' : `Assign to ${selected.length} Student${selected.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
