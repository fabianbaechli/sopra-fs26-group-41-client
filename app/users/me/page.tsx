"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, Spin, Typography, Button, Input, Tooltip } from "antd";
import { TeamOutlined, InfoCircleOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import type { MyProfile, LetterboxdImportResponse } from "@/types/user";
import styles from "@/styles/page.module.css"
import Link from "next/link";

const { Title, Text } = Typography;
const { Search } = Input;


const Profile: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const { clear: clearToken } = useLocalStorage<string>("token", "");
  const [searchQuery, setSearchQuery] = useState("");

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenDialog = () => {
    setIsUploadDialogOpen(true);
    setUploadError(null);
    setSelectedFile(null);
    setUploadSuccess(false);
    resetFileInput();
  };

  const handleCloseDialog = () => {
    if (isUploading) return;
    setIsUploadDialogOpen(false);
    setUploadError(null);
    setSelectedFile(null);
    setUploadSuccess(false);
    resetFileInput();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleConfirmUpload = () => {
    if (selectedFile) {
      handleLetterboxdUpload(selectedFile);
    }
  };

  const handleSearch = () => {
    const submittedQuery = searchQuery.trim();

    if (!submittedQuery) {
      return;
    }

    router.push(`/search?query=${encodeURIComponent(submittedQuery)}`);
  };

  const handleLogout = async () => {
    try {
      await apiService.post("/logout", {});
    } catch {
    } finally {
      clearToken();
      router.replace("/login");
    }
  };


  const handleLetterboxdUpload = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiService.upload<LetterboxdImportResponse>("/import", formData);

      const updatedProfile: MyProfile = {
        id: response.id,
        username: response.username,
        hasLetterboxdData: response.hasLetterboxdData,
        stats: {
          moviesLogged: response.stats?.moviesLogged ?? 0,
          highlyRatedMovies: response.stats?.highlyRatedMovies ?? 0
        },
      };

      setProfile(updatedProfile);
      setError(null);
      setUploadSuccess(true);
    } catch (err) {
      resetFileInput();
      setUploadError("Upload failed. Please check the file and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenCreateGroup = () => {
    router.push("/create");
  };


  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setIsLoading(false);
        clearToken();
        router.replace("/login");
        return;
      }

      try {
        const response = await apiService.get<Partial<MyProfile>>("/users/me");

        const safeProfile: MyProfile = {
          id: response.id ?? 0,
          username: response.username ?? "User",
          hasLetterboxdData: response.hasLetterboxdData ?? false,
          stats: {
            moviesLogged: response.stats?.moviesLogged ?? 0,
            highlyRatedMovies: response.stats?.highlyRatedMovies ?? 0
          },
        };

        setProfile(safeProfile);
        setError(null);
      } catch (err) {
        const status =
          (err as { status?: number; response?: { status?: number } })?.status ??
          (err as { response?: { status?: number } })?.response?.status;

        if (status === 401 || status === 403) {
          clearToken();
          router.replace("/login");
          return;
        }

        setError("Could not load your profile. Please refresh the page.");

        setProfile({
          id: 0,
          username: "User",
          hasLetterboxdData: false,
          stats: {
            moviesLogged: 0,
            highlyRatedMovies: 0
          },
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [apiService, clearToken, router]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <div className={styles.loadingWrap}>
            <Spin size="large" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <Card className={styles.shellCard}>
            <Text type="danger">{error ?? "Failed to load profile."}</Text>
          </Card>
        </div>
      </div>
    );
  }

  const isConnected = profile.hasLetterboxdData;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            <Link href="/users/me" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={styles.brandRow}>
                <img src="/logo.png" alt="logo" className={styles.logo} />
                <Title level={1} className={styles.brand}>
                  Movieblendr.
                </Title>
              </div>
            </Link>

            <Title level={3} className={styles.subtitle}>
              My Profile
            </Title>
          </div>
          <div className={styles.heroRight}>
            <Search
              className={styles.searchInput}
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onSearch={handleSearch}
              enterButton
            />
            <Button className={styles.authButton} onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
        <Card className={styles.shellCard}>
          {error && (
            <div className={styles.warningBox}>
              <Text className={styles.warningLabel}>Fallback data</Text>
              <br />
              <Text className={styles.warningText}>{error}</Text>
            </div>
          )}

          <div className={styles.infoGrid}>
            <Card className={styles.softCard}>
              <div className={styles.label}>Username </div>
              <Title level={2} className={styles.username}>
                {profile.username}
              </Title>
              <Text className={styles.helperText} style={{ marginTop: "-9px", display: "block" }}>Your account</Text>
            </Card>

            <Card className={styles.softCard}>
              <div className={styles.label}>Letterboxd</div>
              <div className={styles.statusRow}>
                <span
                  className={isConnected ? styles.statusDotConnected : styles.statusDotNotConnected}
                />
                <Title
                  level={4}
                  className={isConnected ? styles.connected : styles.notConnected}
                >
                  {isConnected ? "Connected" : "Not connected"}
                </Title>
              </div>
              <Text className={styles.helperText} style={{ marginTop: "8px", display: "block" }}>
                {isConnected
                  ? "Your Letterboxd data is available and your stats are shown below."
                  : "No Letterboxd data uploaded yet. Upload now to get recommendations."}
              </Text>

              <Button
                onClick={handleOpenDialog}
                className={styles.uploadTriggerButton}
                type="primary"
              >
                {isConnected ? "Update" : "Upload"}
              </Button>
            </Card>
          </div>

          <div className={styles.section}>
            <Title level={3} className={styles.sectionTitle}>
              Stats
            </Title>

            <div className={styles.infoGrid}>
              <Card className={styles.softCard}>
                <div className={styles.label}>Movies logged</div>
                <div className={styles.statValue}>{profile.stats.moviesLogged}</div>
                <Text className={styles.helperText} style={{ marginTop: "9px", display: "block" }}>
                  {profile.stats.moviesLogged > 100
                    ? "That’s a lot of movies!"
                    : "Still warming up, keep watching!"}
                </Text>
              </Card>

              <Card className={styles.softCard}>
                <div className={styles.label}>Highly rated</div>
                <div className={styles.statValue}>{profile.stats.highlyRatedMovies}</div>
                <Text className={styles.helperText} style={{ marginTop: "9px", display: "block" }} >4.5★ and above</Text>
              </Card>
            </div>
          </div>
        </Card>

        <div className={styles.howItWorksFabWrap}>
          <Button className={styles.howItWorksFab} onClick={() => router.push("/how-it-works")}>
            <InfoCircleOutlined />
            How it works
          </Button>
        </div>
        <div className={styles.fabRow}>
          <Button className={styles.groupsOverviewFab} onClick={() => router.push("/groups")}>
            <TeamOutlined />
            My Groups
          </Button>
          <Tooltip
            title={<span style={{ color: "#e2a684", fontSize: "11px", letterSpacing: "0.08em" }}>CREATE GROUP</span>}
            placement="bottom"
            color="rgba(21, 18, 17, 0.96)"
          >
            <Button className={styles.createGroupFab} onClick={handleOpenCreateGroup}>
              +
            </Button>
          </Tooltip>
        </div>
      </div >

      {isUploadDialogOpen && (
        <div className={styles.modalOverlay} onClick={handleCloseDialog}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Title level={3} className={styles.modalTitle}>
              {isConnected ? "Update Letterboxd Data" : "Upload Letterboxd Data"}
            </Title>

            {uploadSuccess ? (
              <div className={styles.uploadSuccessPanel}>
                <CheckCircleOutlined className={styles.uploadSuccessIcon} />
                <Text className={styles.uploadSuccessTitle}>Upload successful</Text>
                <Text className={styles.uploadSuccessBody}>
                  Your rated movies have been processed. Your stats are now up to date.
                </Text>
                <Button className={styles.modalConfirmButton} onClick={handleCloseDialog}>
                  Done
                </Button>
              </div>
            ) : (
              <>
                <Text className={styles.modalSubtitle}>
                  {isConnected
                    ? "Replace your current Movieblendr stats with a fresh Letterboxd export."
                    : "Import your Letterboxd history to generate your statistics."}
                </Text>

                <Text className={styles.modalLetterboxdNote}>
                  New to Letterboxd? It&apos;s a social platform for logging and rating movies.{" "}
                  <a href="https://letterboxd.com" target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
                    letterboxd.com
                  </a>
                </Text>

                <div className={styles.instructionBlock}>
                  <Text className={styles.instructionText}>How to get your data:</Text>
                  <ul className={styles.instructionList}>
                    <li>Go to <a href="https://letterboxd.com/settings/data/" target="_blank" rel="noopener noreferrer" className={styles.externalLink}>Letterboxd Data Settings</a></li>
                    <li>Download your account export (ZIP)</li>
                    <li>Upload the <strong>entire downloaded .zip file</strong> here</li>
                    <li>Only your <strong>rated movies</strong> are analyzed — diary entries, watchlist, and liked films are not used</li>
                  </ul>
                </div>

                {uploadError && (
                  <div className={styles.errorAlert} style={{ marginBottom: "20px" }}>
                    <Text type="danger">{uploadError}</Text>
                  </div>
                )}

                <div
                  className={`${styles.fileDropZone} ${selectedFile && !isUploading ? styles.fileDropZoneActive : ''}`}
                  onClick={() => { if (!isUploading) fileInputRef.current?.click(); }}
                >
                  <input
                    type="file"
                    accept=".zip"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                  />
                  {isUploading ? (
                    <div className={styles.dropZoneEmpty}>
                      <Text className={styles.dropZonePrompt}>Processing your data…</Text>
                      <Text className={styles.dropZoneSecondary}>This may take a moment</Text>
                    </div>
                  ) : selectedFile ? (
                    <div className={styles.fileSelectedFeedback}>
                      <Text className={styles.selectedFileText}>📦 {selectedFile.name}</Text>
                      <Text className={styles.fileReadyText}>Ready to upload</Text>
                    </div>
                  ) : (
                    <div className={styles.dropZoneEmpty}>
                      <Text className={styles.dropZonePrompt}>Click to browse</Text>
                      <Text className={styles.dropZoneSecondary}>ZIP archive only</Text>
                    </div>
                  )}
                </div>

                <div className={styles.modalActions}>
                  <Button
                    onClick={handleCloseDialog}
                    className={styles.modalCancelButton}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmUpload}
                    className={styles.modalConfirmButton}
                    disabled={!selectedFile || isUploading}
                    loading={isUploading}
                  >
                    {isUploading ? "Uploading…" : "Confirm"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div >
  );
};

export default Profile;