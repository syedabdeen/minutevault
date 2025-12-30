import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2,
  Upload,
  Globe,
  Languages,
  Save,
  ImageIcon,
  FileText,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [companyProfile, setCompanyProfile] = useState({
    name: "Acme Corporation",
    address: "123 Business Park, Suite 500\nNew York, NY 10001",
    phone: "+1 (555) 123-4567",
    email: "contact@acmecorp.com",
    website: "www.acmecorp.com",
  });

  const [region, setRegion] = useState("global");
  const [language, setLanguage] = useState("en");
  const [uploadedDocs, setUploadedDocs] = useState([
    { id: 1, name: "Company Policy Manual.pdf", size: "2.4 MB" },
    { id: 2, name: "Meeting Guidelines.docx", size: "156 KB" },
  ]);

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  const regions = [
    { value: "global", label: "Global" },
    { value: "india", label: "India" },
    { value: "uae", label: "UAE" },
    { value: "ksa", label: "Saudi Arabia (KSA)" },
    { value: "us", label: "United States" },
    { value: "uk", label: "United Kingdom" },
  ];

  const languages = [
    { value: "en", label: "English" },
    { value: "ar", label: "Arabic" },
    { value: "hi", label: "Hindi" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
  ];

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure your company profile and preferences
            </p>
          </div>
          <Button variant="gradient" onClick={handleSave}>
            <Save size={18} />
            Save All Changes
          </Button>
        </div>

        {/* Company Profile */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 size={20} />
              Company Profile
            </CardTitle>
            <CardDescription>
              This information will appear on your generated MoM documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border bg-secondary/30 flex items-center justify-center">
                  <ImageIcon size={32} className="text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <Button variant="outline" className="mb-2">
                    <Upload size={16} />
                    Upload Logo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    PNG or JPG. This logo will appear centered at the top of MoM documents.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyProfile.name}
                  onChange={(e) =>
                    setCompanyProfile({ ...companyProfile, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={companyProfile.website}
                  onChange={(e) =>
                    setCompanyProfile({
                      ...companyProfile,
                      website: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={companyProfile.address}
                onChange={(e) =>
                  setCompanyProfile({
                    ...companyProfile,
                    address: e.target.value,
                  })
                }
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={companyProfile.phone}
                  onChange={(e) =>
                    setCompanyProfile({
                      ...companyProfile,
                      phone: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={companyProfile.email}
                  onChange={(e) =>
                    setCompanyProfile({
                      ...companyProfile,
                      email: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reference Documents */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} />
              Legal & Reference Documents
            </CardTitle>
            <CardDescription>
              Upload documents for AI to extract and reference contextually
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center mb-4">
              <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
              <p className="font-medium mb-1">Drop files here or click to upload</p>
              <p className="text-sm text-muted-foreground">
                Supports PDF, Word, and image files
              </p>
              <Button variant="outline" className="mt-4">
                Browse Files
              </Button>
            </div>

            {uploadedDocs.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Documents</Label>
                {uploadedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-primary" />
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.size}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Region & Language */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe size={20} />
              Region & Language
            </CardTitle>
            <CardDescription>
              Configure default region and language for MoM generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Globe size={16} />
                  Region
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {regions.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRegion(r.value)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        region === r.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-secondary/80"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Languages size={16} />
                  Language
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {languages.map((l) => (
                    <button
                      key={l.value}
                      onClick={() => setLanguage(l.value)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        language === l.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary hover:bg-secondary/80"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
