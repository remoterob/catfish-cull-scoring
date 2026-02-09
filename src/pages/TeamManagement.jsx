import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Users, Plus, Search, Edit, Trash2 } from 'lucide-react'

const SNZ_LOGO = import.meta.env.VITE_SNZ_LOGO_URL || '/api/placeholder/200/80'

export default function TeamManagement() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDivision, setFilterDivision] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    team_number: '',
    division: 'Open',
    competitor1_name: '',
    competitor1_email: '',
    competitor2_name: '',
    competitor2_email: '',
    competitor3_name: '',
    competitor3_email: '',
    club: '',
    notes: ''
  })

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('team_number')

      if (error) throw error
      setTeams(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching teams:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      if (editingTeam) {
        const { error } = await supabase
          .from('teams')
          .update(formData)
          .eq('id', editingTeam.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('teams')
          .insert([formData])

        if (error) throw error
      }

      fetchTeams()
      setShowAddModal(false)
      setEditingTeam(null)
      resetForm()
    } catch (error) {
      console.error('Error saving team:', error)
      alert('Error saving team: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this team?')) return

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchTeams()
    } catch (error) {
      console.error('Error deleting team:', error)
      alert('Error deleting team: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      team_number: '',
      division: 'Open',
      competitor1_name: '',
      competitor1_email: '',
      competitor2_name: '',
      competitor2_email: '',
      competitor3_name: '',
      competitor3_email: '',
      club: '',
      notes: ''
    })
  }

  const startEdit = (team) => {
    setFormData(team)
    setEditingTeam(team)
    setShowAddModal(true)
  }

  const filteredTeams = teams
    .filter(t => filterDivision === 'All' || t.division === filterDivision)
    .filter(t => 
      searchTerm === '' ||
      t.team_number.toString().includes(searchTerm) ||
      t.competitor1_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.competitor2_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.competitor3_name && t.competitor3_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )

  if (loading) {
    return <div className="p-8 text-center">Loading teams...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <img src={SNZ_LOGO} alt="Spearfishing New Zealand" className="h-12 object-contain" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
                <p className="text-gray-600">Manage registrations, pairs, and divisions</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Back to Dashboard
            </button>
          </div>

          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option>All</option>
              <option>Open</option>
              <option>Women</option>
              <option>Juniors</option>
            </select>

            <button
              onClick={() => {
                resetForm()
                setEditingTeam(null)
                setShowAddModal(true)
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Team
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Team #</th>
                <th className="px-4 py-3 text-left">Division</th>
                <th className="px-4 py-3 text-left">Competitors</th>
                <th className="px-4 py-3 text-left">Club</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.map((team) => (
                <tr key={team.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold">#{team.team_number}</td>
                  <td className="px-4 py-3">{team.division}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div>{team.competitor1_name} & {team.competitor2_name}</div>
                      {team.competitor3_name && (
                        <div className="text-gray-500">+ {team.competitor3_name}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{team.club || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(team)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(team.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTeams.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    No teams found. Click "Add Team" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">
              {editingTeam ? 'Edit Team' : 'Add New Team'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Team Number *</label>
                  <input
                    type="number"
                    required
                    value={formData.team_number}
                    onChange={(e) => setFormData({...formData, team_number: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Division *</label>
                  <select
                    required
                    value={formData.division}
                    onChange={(e) => setFormData({...formData, division: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option>Open</option>
                    <option>Women</option>
                    <option>Juniors</option>
                  </select>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Competitor 1 *</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={formData.competitor1_name}
                    onChange={(e) => setFormData({...formData, competitor1_name: e.target.value})}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={formData.competitor1_email}
                    onChange={(e) => setFormData({...formData, competitor1_email: e.target.value})}
                    className="px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Competitor 2 *</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={formData.competitor2_name}
                    onChange={(e) => setFormData({...formData, competitor2_name: e.target.value})}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={formData.competitor2_email}
                    onChange={(e) => setFormData({...formData, competitor2_email: e.target.value})}
                    className="px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Competitor 3 (Optional)</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={formData.competitor3_name}
                    onChange={(e) => setFormData({...formData, competitor3_name: e.target.value})}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.competitor3_email}
                    onChange={(e) => setFormData({...formData, competitor3_email: e.target.value})}
                    className="px-3 py-2 border rounded-lg"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Note: 3-person teams are not eligible for prizes
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Club</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={formData.club}
                  onChange={(e) => setFormData({...formData, club: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Notes</label>
                <textarea
                  placeholder="Optional notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="2"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingTeam ? 'Update Team' : 'Add Team'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingTeam(null)
                    resetForm()
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
