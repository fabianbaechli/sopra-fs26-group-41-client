"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Typography } from "antd";
import { TeamOutlined, CopyOutlined, CheckOutlined } from "@ant-design/icons";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { GroupDetails } from "@/types/group";
import styles from "@/styles/page.module.css";

const { Title, Text } = Typography;

const CreateGroup: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const { clear: clearToken } = useLocalStorage<string>("token", "");

  const [groupName, setGroupName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success Confirmation State
  const [createdGroup, setCreatedGroup] = useState<GroupDetails | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
  };

  const handleCreateGroup = async () => {
    const trimmedName = groupName.trim();

    if (!trimmedName) {
      setError("Please enter a group name.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiService.post<GroupDetails>("/groups", {
        name: trimmedName,
      });

      // Capture resulting object into state to present confirmation screen
      setCreatedGroup(response);
    } catch (err) {
      if (err instanceof Error) {
        const status = (err as { status?: number }).status;

        if (status === 401 || status === 403) {
          clearToken();
          router.replace("/login");
          return;
        }

        setError("Something went wrong. Please try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build full origin link for copying
  const joinToken = createdGroup?.joinUrl
    ? createdGroup.joinUrl.split("/").filter(Boolean).pop() ?? ""
    : "";

  const fullJoinUrl = typeof window !== "undefined" && joinToken
    ? `${window.location.origin}/join/${joinToken}`
    : "";

  const handleCopyLink = () => {
    if (fullJoinUrl) {
      navigator.clipboard.writeText(fullJoinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
            {!createdGroup && (
              <div style={{ marginTop: "70px", marginLeft: "285px", marginBottom: "-17px" }}>
                <Title
                  level={3}
                  className={styles.subtitle}
                  style={{ textAlign: "center", width: "100%" }}
                >
                  Create Group
                </Title>
              </div>
            )}
          </div>

          <div className={styles.heroRight}>
            <Button className={styles.authButton} onClick={() => router.back()}>
              Back
            </Button>
            <Button className={styles.authButton} onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>

        <div>
          {createdGroup ? (
            <Card
              className={`${styles.shellCard} ${styles.createGroupCard}`}
              style={{ maxWidth: "620px", margin: "0 auto" }}
            >
              <div className={styles.createGroupForm}>
                <div style={{ textAlign: "center", marginBottom: "18px" }}>
                  <Title level={4} style={{ color: "#fff4eb", margin: 0 }}>
                    Group created
                  </Title>
                </div>

                <Button
                  className={styles.authButton}
                  style={{
                    width: "220px",
                    margin: "0 auto 12px auto",
                    height: "44px",
                    display: "block",
                  }}
                  onClick={handleCopyLink}
                  icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                >
                  {copied ? "Invite link copied" : "Copy invite link"}
                </Button>

                <Button
                  className={styles.createGroupSubmit}
                  onClick={() => router.push(`/groups/${createdGroup.id}`)}
                >
                  Go to Group
                </Button>
              </div>
            </Card>
          ) : (
            <Card className={`${styles.shellCard} ${styles.createGroupCard}`}>
              <div className={styles.createGroupForm}>
                <div className={styles.label}>Group Name</div>

                <Input
                  className={styles.createGroupInput}
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  onPressEnter={handleCreateGroup}
                  maxLength={50}
                />

                {error && <Text className={styles.createGroupError}>{error}</Text>}

                <div className={styles.createGroupSubmitWrap}>
                  <Button
                    className={styles.createGroupSubmit}
                    onClick={handleCreateGroup}
                    loading={isSubmitting}
                    icon={<TeamOutlined />}
                  >
                    Create Group
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateGroup;