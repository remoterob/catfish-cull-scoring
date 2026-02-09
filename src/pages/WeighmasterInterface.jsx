import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Camera, Check } from 'lucide-react'

const SNZ_LOGO = import.meta.env.VITE_SNZ_LOGO_URL || '/api/placeholder/200/80'

export default function WeighmasterInterface() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [teamNumber, setTeamNumber] = useState('')
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [catfishCount, setCatfishCount] = useState('')
  const [heaviestFish, setHeaviestFish] = useState('')
  const [lightestFish, setLightestFish] = useState('')
  const [photos, setPhotos] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .order('team_number')
    
    setTeams(data || [])
  }

  useEffect(() => {
    if (teamNumber) {
      const team = teams.find(t => t.team_number === parseInt(teamNumber))
      setSelectedTeam(team || null)
    } else {
      setSelectedTeam(null)
    }
  }, [teamNumber, teams])

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files)
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('catch-photos')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Error uploading:', uploadError)
        continue
      }

      const { data } = supabase.storage
        .from('catch-photos')
        .getPublicUrl(filePath)

      setPhotos(prev => [...prev, data.publicUrl])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Insert catch
      const { data: catchData, error: catchError } = await supabase
        .from('catches')
        .insert([{
          team_id: selectedTeam.id,
          catfish_count: parseInt(catfishCount),
          heaviest_fish_grams: heaviestFish ? parseInt(heaviestFish) : null,
          lightest_fish_grams: lightestFish ? parseInt(lightestFish) : null,
          photo_urls: photos,
          status: 'provisional'
        }])
        .select()
        .single()

      if (catchError) throw catchError

      // Send email via Netlify function
      const emails = [selectedTeam.competitor1_email, selectedTeam.competitor2_email]
      if (selectedTeam.competitor3_email) emails.push(selectedTeam.competitor3_email)

      const eligible = !selectedTeam.competitor3_name

      await fetch('/.netlify/functions/send-results-email', {
        method: 'POST',
        body: JSON.stringify({
          emails,
          teamNumber: selectedTeam.team_number,
          teamNames: `${selectedTeam.competitor1_name} & ${selectedTeam.competitor2_name}${selectedTeam.competitor3_name ? ' & ' + selectedTeam.competitor3_name : ''}`,
          catfishCount: parseInt(catfishCount),
          division: selectedTeam.division,
          heaviestFish: heaviestFish ? parseInt(heaviestFish) : null,
          lightestFish: lightestFish ? parseInt(lightestFish) : null,
          eligible
        })
      })

      alert('Score submitted successfully! Email sent to team.')
      
      // Reset form
      setTeamNumber('')
      setSelectedTeam(null)
      setCatfishCount('')
      setHeaviestFish('')
      setLightestFish('')
      setPhotos([])
    } catch (error) {
      console.error('Error submitting:', error)
      alert('Error submitting score: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <img src={SNZ_LOGO} alt="Spearfishing New Zealand" className="h-12 object-contain" />
              <h1 className="text-3xl font-bold text-gray-900">Weighmaster Interface</h1>
            </div>
            <button
              onClick={() => navigate('/admin')}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Back to Dashboard
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Team Number */}
            <div>
              <label className="block text-lg font-semibold mb-2">Team Number</label>
              <input
                type="number"
                required
                value={teamNumber}
                onChange={(e) => setTeamNumber(e.target.value)}
                placeholder="Enter team number"
                className="w-full px-4 py-3 text-2xl border-2 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Team Info Display */}
            {selectedTeam && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-2">Team #{selectedTeam.team_number}</h3>
                <p><strong>Division:</strong> {selectedTeam.division}</p>
                <p><strong>Competitors:</strong> {selectedTeam.competitor1_name} & {selectedTeam.competitor2_name}</p>
                {selectedTeam.competitor3_name && (
                  <>
                    <p className="text-orange-600"><strong>+ {selectedTeam.competitor3_name}</strong></p>
                    <p className="text-sm text-orange-600 mt-2">⚠️ 3-person team - Not eligible for prizes</p>
                  </>
                )}
              </div>
            )}

            {!selectedTeam && teamNumber && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-red-700">
                Team #{teamNumber} not found. Please check the number.
              </div>
            )}

            {/* Catfish Count */}
            <div>
              <label className="block text-lg font-semibold mb-2">Catfish Count *</label>
              <input
                type="number"
                required
                min="0"
                value={catfishCount}
                onChange={(e) => setCatfishCount(e.target.value)}
                placeholder="Number of catfish"
                className="w-full px-4 py-3 text-2xl border-2 rounded-lg focus:border-blue-500 focus:outline-none"
                disabled={!selectedTeam}
              />
            </div>

            {/* Prize Fish (Optional) */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-lg font-semibold mb-2">
                  Heaviest Fish (grams)
                  <span className="text-sm font-normal text-gray-500"> - Optional</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={heaviestFish}
                  onChange={(e) => setHeaviestFish(e.target.value)}
                  placeholder="e.g., 450"
                  className="w-full px-4 py-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none"
                  disabled={!selectedTeam}
                />
              </div>

              <div>
                <label className="block text-lg font-semibold mb-2">
                  Lightest Fish (grams)
                  <span className="text-sm font-normal text-gray-500"> - Optional</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={lightestFish}
                  onChange={(e) => setLightestFish(e.target.value)}
                  placeholder="e.g., 85"
                  className="w-full px-4 py-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none"
                  disabled={!selectedTeam}
                />
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-lg font-semibold mb-2">
                Photos
                <span className="text-sm font-normal text-gray-500"> - Optional</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                  disabled={!selectedTeam}
                />
                <label
                  htmlFor="photo-upload"
                  className={`flex flex-col items-center cursor-pointer ${!selectedTeam && 'opacity-50'}`}
                >
                  <Camera className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-gray-600">Click to upload photos</span>
                  <span className="text-sm text-gray-400">or drag and drop</span>
                </label>
              </div>
              {photos.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {photos.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt="Catch" className="w-20 h-20 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!selectedTeam || !catfishCount || submitting}
              className="w-full bg-green-600 text-white py-4 rounded-lg text-xl font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                'Submitting...'
              ) : (
                <>
                  <Check className="w-6 h-6" />
                  Submit Score & Send Email
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
          <h3 className="font-bold text-yellow-800 mb-2">Quick Tips</h3>
          <ul className="text-yellow-800 text-sm space-y-1">
            <li>• Enter team number first - team details will auto-fill</li>
            <li>• Catfish count is required, prize fish weights are optional</li>
            <li>• Photos are optional but recommended for verification</li>
            <li>• Emails are sent automatically when you submit</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
