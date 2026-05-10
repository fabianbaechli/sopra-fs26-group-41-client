"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Spin, Typography } from "antd";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import type { GroupSummary, GroupsListResponse } from "@/types/group";
import styles from "@/styles/page.module.css";
import GroupPicture from "@/components/GroupPicture";

const { Title, Text } = Typography;

const GroupsOverview: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const { clear: clearToken } = useLocalStorage<string>("token", "");

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
  };

  useEffect(() => {
    let isMounted = true;

    const fetchGroups = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await apiService.get<GroupsListResponse>("/groups");
        if (!isMounted) return;
        setGroups(response.groups ?? []);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        const status = (err as { status?: number }).status;
        if (status === 401 || status === 403) {
          clearToken();
          router.replace("/login");
          return;
        }
        setError("Could not load your groups. Please try again.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchGroups();

    return () => {
      isMounted = false;
    };
  }, [apiService, clearToken, router]);

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
              My Groups
            </Title>
          </div>
          <div className={styles.heroRight}>
            <Button className={styles.authButton} onClick={() => router.push("/users/me")}>
              Back
            </Button>
            <Button className={styles.authButton} onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        <Card className={styles.shellCard}>
          {isLoading ? (
            <div className={styles.loadingWrap}>
              <Spin size="large" />
            </div>
          ) : error ? (
            <div className={styles.warningBox}>
              <Text className={styles.warningLabel}>Error</Text>
              <br />
              <Text className={styles.warningText}>{error}</Text>
            </div>
          ) : groups.length === 0 ? (
            <p className={styles.helperText}>You are not a member of any groups yet.</p>
          ) : (
            <div className={styles.groupsGrid}>
              {groups.map((group) => (
                <Card
                  key={group.id}
                  className={`${styles.softCard} ${styles.groupCard}`}
                  onClick={() => router.push(`/groups/${group.id}`)}
                >
                  <div className={styles.groupCardPictureWrap}>
                    <GroupPicture
                      url={group.groupProfilePicture}
                      alt={`${group.name} picture`}
                      className={styles.groupCardPicture}
                      fallback={<span className={styles.groupCardPictureFallback}>No picture</span>}
                    />
                  </div>
                  <p className={styles.groupCardName}>{group.name}</p>
                  <p className={styles.groupCardMeta}>
                    {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default GroupsOverview;
