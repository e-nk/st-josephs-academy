'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Upload, Download, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface BulkImportProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ImportResult {
  message: string
  results: {
    successful: string[]
    failed: Array<{ row: number, admissionNumber: string, error: string }>
    duplicates: string[]
  }
}

export function BulkImport({ open, onClose, onSuccess }: BulkImportProps) {
  const [csvData, setCsvData] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  const downloadTemplate = () => {
    const template = `admissionNumber,firstName,lastName,middleName,class,parentName,parentPhone,parentEmail,dateOfBirth
2024001,John,Doe,,Grade 1,Jane Doe,0722123456,jane@email.com,2010-05-15
2024002,Mary,Smith,Jane,Grade 2,Peter Smith,0733456789,peter@email.com,2009-08-22
2024003,David,Wilson,,PP1,Sarah Wilson,0744789012,sarah@email.com,2015-12-03`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student_import_template.csv'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setCsvData(e.target?.result as string)
      }
      reader.readAsText(file)
    }
  }

  const parseCsvData = (csv: string) => {
    const lines = csv.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    
    const students = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      const student: any = {}
      
      headers.forEach((header, index) => {
        student[header] = values[index] || ''
      })
      
      return student
    })

    return students
  }

  const handleImport = async () => {
    if (!csvData.trim()) {
      setError('Please provide CSV data')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const students = parseCsvData(csvData)
      
      const response = await fetch('/api/students/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(students)
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        if (data.results.successful.length > 0) {
          onSuccess() // Refresh the student list
        }
      } else {
        setError(data.error || 'Import failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setCsvData('')
    setResult(null)
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Students</DialogTitle>
          <DialogDescription>
            Import multiple students from CSV data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Step 1: Download Template</h4>
            <p className="text-sm text-blue-800 mb-3">
              Download the CSV template to ensure your data is in the correct format
            </p>
            <Button onClick={downloadTemplate} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Step 2: Upload CSV File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
            />
          </div>

          {/* Manual CSV Input */}
          <div className="space-y-2">
            <Label htmlFor="csv-data">Or Paste CSV Data Directly</Label>
            <Textarea
              id="csv-data"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="Paste your CSV data here..."
              rows={8}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-3">
              <Alert>
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>

              {result.results.successful.length > 0 && (
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-medium text-green-800">Successfully Imported ({result.results.successful.length}):</h4>
                  <p className="text-sm text-green-700">
                    {result.results.successful.join(', ')}
                  </p>
                </div>
              )}

              {result.results.duplicates.length > 0 && (
                <div className="bg-yellow-50 p-3 rounded">
                  <h4 className="font-medium text-yellow-800">Duplicates Skipped ({result.results.duplicates.length}):</h4>
                  <p className="text-sm text-yellow-700">
                    {result.results.duplicates.join(', ')}
                  </p>
                </div>
              )}

              {result.results.failed.length > 0 && (
                <div className="bg-red-50 p-3 rounded">
                  <h4 className="font-medium text-red-800">Failed ({result.results.failed.length}):</h4>
                  <div className="text-sm text-red-700 space-y-1">
                    {result.results.failed.map((fail, index) => (
                      <div key={index}>
                        Row {fail.row} ({fail.admissionNumber}): {fail.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button onClick={handleImport} disabled={loading || !csvData.trim()}>
            {loading ? 'Importing...' : 'Import Students'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}