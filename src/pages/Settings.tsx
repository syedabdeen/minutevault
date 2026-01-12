import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Upload,
  Globe,
  Languages,
  Save,
  ImageIcon,
  FileText,
  Trash2,
  Loader2,
  Shield,
  Smartphone,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UserSettings {
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_website: string;
  company_logo_url: string;
  region: string;
  language: string;
}

interface WhitelistRequest {
  id: string;
  status: string;
  reason: string;
  admin_response: string | null;
  created_at: string;
}

interface UserProfile {
  is_whitelisted: boolean;
  device_id: string | null;
}

export default function Settings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [companyProfile, setCompanyProfile] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
  });
  const [region, setRegion] = useState("India");
  const [language, setLanguage] = useState("English");
  const [uploadedDocs, setUploadedDocs] = useState([
    { id: 1, name: "Company Policy Manual.pdf", size: "2.4 MB" },
    { id: 2, name: "Meeting Guidelines.docx", size: "156 KB" },
  ]);
  
  // Whitelist request state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [whitelistRequest, setWhitelistRequest] = useState<WhitelistRequest | null>(null);
  const [requestReason, setRequestReason] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchWhitelistStatus();
  }, []);

  const fetchWhitelistStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_whitelisted, device_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserProfile(profile);
      }

      // Fetch latest whitelist request
      const { data: request } = await supabase
        .from("whitelist_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (request) {
        setWhitelistRequest(request);
      }
    } catch (error) {
      console.error("Error fetching whitelist status:", error);
    }
  };

  const handleSubmitWhitelistRequest = async () => {
    if (!requestReason.trim()) {
      toast.error("Please provide a reason for your request");
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const { error } = await supabase
        .from("whitelist_requests")
        .insert({
          user_id: user.id,
          reason: requestReason.trim(),
        });

      if (error) throw error;

      toast.success("Request submitted successfully");
      setRequestReason("");
      fetchWhitelistStatus();
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error("Failed to submit request");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const getRequestStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "Pending Review", icon: Clock, color: "text-warning", bgColor: "bg-warning/10 border-warning/20" };
      case "approved":
        return { label: "Approved", icon: CheckCircle, color: "text-success", bgColor: "bg-success/10 border-success/20" };
      case "rejected":
        return { label: "Rejected", icon: XCircle, color: "text-destructive", bgColor: "bg-destructive/10 border-destructive/20" };
      default:
        return { label: status, icon: Clock, color: "text-muted-foreground", bgColor: "bg-secondary" };
    }
  };

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found, which is fine for new users
        throw error;
      }

      if (data) {
        setCompanyProfile({
          name: data.company_name || "",
          address: data.company_address || "",
          phone: data.company_phone || "",
          email: data.company_email || "",
          website: data.company_website || "",
        });
        setRegion(data.region || "India");
        setLanguage(data.language || "English");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to save settings");
        return;
      }

      const settingsData: Omit<UserSettings, "id"> & { user_id: string } = {
        user_id: user.id,
        company_name: companyProfile.name,
        company_address: companyProfile.address,
        company_phone: companyProfile.phone,
        company_email: companyProfile.email,
        company_website: companyProfile.website,
        company_logo_url: "",
        region,
        language,
      };

      const { error } = await supabase
        .from("user_settings")
        .upsert(settingsData, {
          onConflict: "user_id",
        });

      if (error) throw error;

      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const regions = [
    { value: "Global", label: "Global" },
    { value: "India", label: "India" },
    { value: "UAE", label: "UAE" },
    { value: "KSA", label: "Saudi Arabia (KSA)" },
    { value: "US", label: "United States" },
    { value: "UK", label: "United Kingdom" },
  ];

  const languages = [
    { value: "English", label: "English" },
    { value: "Arabic", label: "Arabic" },
    { value: "Hindi", label: "Hindi" },
    { value: "Spanish", label: "Spanish" },
    { value: "French", label: "French" },
    { value: "German", label: "German" },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

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
          <Button variant="gradient" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save All Changes
              </>
            )}
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
                  placeholder="Enter company name"
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
                  placeholder="www.example.com"
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
                placeholder="Enter company address"
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
                  placeholder="+1 (555) 123-4567"
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
                  placeholder="contact@company.com"
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
        <Card className="mb-6">
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

        {/* Account Access - Whitelist Request */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield size={20} />
              Account Access
            </CardTitle>
            <CardDescription>
              Manage your device access and request multi-device support
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Status */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Device Status</p>
                  <p className="text-sm text-muted-foreground">
                    {userProfile?.device_id ? "Device bound to your account" : "No device bound yet"}
                  </p>
                </div>
              </div>
              {userProfile?.is_whitelisted ? (
                <Badge className="bg-success/20 text-success border-success/30 gap-1">
                  <Shield className="w-3 h-3" />
                  Multi-Device Enabled
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Smartphone className="w-3 h-3" />
                  Single Device
                </Badge>
              )}
            </div>

            {/* Show request status or form */}
            {userProfile?.is_whitelisted ? (
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-5 h-5" />
                  <p className="font-medium">Multi-device access is enabled</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  You can access your account from multiple devices.
                </p>
              </div>
            ) : whitelistRequest?.status === "pending" ? (
              <div className="space-y-3">
                <div className={`p-4 rounded-lg border ${getRequestStatusInfo("pending").bgColor}`}>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-warning" />
                    <p className="font-medium text-warning">Request Pending</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your multi-device access request is being reviewed by admin.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Submitted: {new Date(whitelistRequest.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ) : whitelistRequest?.status === "rejected" ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${getRequestStatusInfo("rejected").bgColor}`}>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-destructive" />
                    <p className="font-medium text-destructive">Previous Request Rejected</p>
                  </div>
                  {whitelistRequest.admin_response && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Admin response: {whitelistRequest.admin_response}
                    </p>
                  )}
                </div>
                
                {/* Allow re-submit */}
                <div className="space-y-3">
                  <Label htmlFor="requestReason">Submit New Request</Label>
                  <Textarea
                    id="requestReason"
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="Explain why you need multi-device access (e.g., I work from both office and home)..."
                    rows={3}
                  />
                  <Button 
                    onClick={handleSubmitWhitelistRequest}
                    disabled={isSubmittingRequest || !requestReason.trim()}
                  >
                    {isSubmittingRequest ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Request Multi-Device Access
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Your account is currently restricted to a single device. If you need to access 
                    your account from multiple devices, you can request multi-device access from admin.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requestReason">Reason for Request</Label>
                  <Textarea
                    id="requestReason"
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="Explain why you need multi-device access (e.g., I work from both office and home)..."
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={handleSubmitWhitelistRequest}
                  disabled={isSubmittingRequest || !requestReason.trim()}
                >
                  {isSubmittingRequest ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Request Multi-Device Access
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}