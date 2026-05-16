"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Spin, Typography } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { ApiService } from "@/api/apiService";
import type { UserProfile } from "@/types/user";
import styles from "@/styles/page.module.css";

const { Title, Text } = Typography;

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tasteOverlap, setTasteOverlap] = useState<number | null>(null);
  const [tasteOverlapLoading, setTasteOverlapLoading] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!userId) return;

    let isMounted = true;

    const fetchProfile = async () => {
      let redirectedToOwnProfile = false;

      try {
        setLoading(true);
        setError(null);
        setTasteOverlapLoading(true);

        const api = new ApiService();

        try {
          const me = await api.get<UserProfile>("/users/me");

          if (me.id === Number(userId)) {
            redirectedToOwnProfile = true;
            if (isMounted) {
              setProfile({
                id: me.id,
                username: me.username,
                hasLetterboxdData: me.hasLetterboxdData ?? false,
                tasteOverlap: 100,
                stats: {
                  moviesLogged: me.stats?.moviesLogged ?? 0,
                  highlyRatedMovies: me.stats?.highlyRatedMovies ?? 0,
                },
              });

              setTasteOverlap(100);
              setLoading(false);
              setTasteOverlapLoading(false);
            }

            return;
          }
        } catch {
        }

        const data = await api.get<UserProfile>(`/users/${userId}`);

        if (isMounted) {
          setProfile({
            id: data.id,
            username: data.username,
            hasLetterboxdData: data.hasLetterboxdData ?? false,
            tasteOverlap: data.tasteOverlap,
            stats: {
              moviesLogged: data.stats?.moviesLogged ?? 0,
              highlyRatedMovies: data.stats?.highlyRatedMovies ?? 0,
            },
          });

          setTasteOverlap(
            typeof data.tasteOverlap === "number" ? data.tasteOverlap : null
          );
        }
      } catch (err: unknown) {
        if (isMounted) {
          const apiError = err as { status?: number; message?: string };

          if (apiError.status === 401) {
            router.replace("/login");
            return;
          }

          setError("Could not load this user's profile. Please try again.");
        }
      } finally {
        if (isMounted && !redirectedToOwnProfile) {
          setLoading(false);
          setTasteOverlapLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [userId, router]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <div className={styles.loadingWrap}>
            <Spin size="large" />
            <p className={styles.helperText}>Computing your taste overlap...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <Card className={styles.shellCard}>
            <div className={styles.warningBox}>
              <Text className={styles.warningText}>
                <strong>Error:</strong> {error || "User profile could not be found."}
              </Text>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            <Link href="/users/me" style={{ textDecoration: "none", color: "inherit" }}>
              <div className={styles.brandRow}>
                <img src="/logo.png" alt="logo" className={styles.logo} />
                <Title level={1} className={styles.brand}>
                  Movieblendr.
                </Title>
              </div>
            </Link>

            <Title level={3} className={styles.subtitle}>
              {`${profile.username}'s Profile`}
            </Title>
          </div>

          <div className={styles.heroRight}>
            <Button className={styles.authButton} onClick={() => router.back()}>
              Back
            </Button>
          </div>
        </div>

        <Card className={styles.shellCard}>
          <div className={styles.infoGrid}>
            <Card className={styles.softCard}>
              <div className={styles.label}>Username</div>
              <Title level={2} className={styles.username}>
                {profile.username}
              </Title>
              <Text className={styles.helperText} style={{ marginTop: "-9px", display: "block" }}>
                ID - {String(profile.id).padStart(3, "0")}
              </Text>
            </Card>

            <Card className={styles.softCard}>
              <div className={styles.label}>
                <TeamOutlined /> Taste overlap
              </div>

              {tasteOverlapLoading ? (
                <Spin />
              ) : typeof tasteOverlap === "number" ? (
                <>
                  <div className={styles.statusRow}>
                    <Title level={2} className={`${styles.connected} ${styles.overlapValue}`}>
                      {tasteOverlap}%
                    </Title>
                    <Text className={`${styles.helperText} ${styles.overlapSideText}`}>
                      {tasteOverlap === 100 ? "Look at that, you're you!" : "with you"}
                    </Text>
                  </div>
                  {tasteOverlap !== 100 && (
                    <Text className={`${styles.helperText} ${styles.overlapSubText}`}>
                      Based on shared movies and rating patterns
                    </Text>
                  )}
                </>
              ) : (
                <Text className={styles.helperText}>Taste overlap unavailable.</Text>
              )}
            </Card>
          </div>

          <>
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
                      ? "Your friend is a real movie nerd!"
                      : "Could be better... watch more!"}
                  </Text>
                </Card>

                <Card className={styles.softCard}>
                  <div className={styles.label}>Highly rated</div>
                  <div className={styles.statValue}>{profile.stats.highlyRatedMovies}</div>
                  <Text className={styles.helperText} style={{ marginTop: "9px", display: "block" }}>
                    4.5★ and above
                  </Text>
                </Card>
              </div>
            </div>
          </>
        </Card>
      </div >
    </div >
  );
}