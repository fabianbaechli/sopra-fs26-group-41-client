"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Spin } from "antd";
import { TeamOutlined, CopyOutlined, CheckOutlined, UserOutlined, PlayCircleOutlined } from "@ant-design/icons";
import { ApiService } from "@/api/apiService";
import { GroupDetails, DrawingJoinResponse } from "@/types/group";
import styles from "@/styles/page.module.css";
import { PollResultMovie, PollResultsResponse } from "@/types/poll";

export default function GroupOverview() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLeaving, setIsLeaving] = useState<boolean>(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState<boolean>(false);

  const [recommendations, setRecommendations] = useState<unknown[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState<boolean>(true);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  const [pollResults, setPollResults] = useState<PollResultMovie[]>([]);
  const [pollResultsLoading, setPollResultsLoading] = useState<boolean>(false);
  const [pollResultsError, setPollResultsError] = useState<string | null>(null);

  const [startingPoll, setStartingPoll] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [pollOwnerMessage, setPollOwnerMessage] = useState<string | null>(null);
  const [isStartPollDialogOpen, setIsStartPollDialogOpen] = useState<boolean>(false);

  const [joiningDrawingSession, setJoiningDrawingSession] = useState<boolean>(false);
  const [drawingJoinError, setDrawingJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;

    let isMounted = true;

    const fetchGroupDetails = async () => {
      try {
        setLoading(true);
        setRecommendationsLoading(false);

        const api = new ApiService();
        const data = await api.get<GroupDetails>(`/groups/${groupId}`);

        if (isMounted) {
          setGroup(data);
          setError(null);
          setLoading(false);
          setRecommendationsLoading(true);
        }
        try {
          const meData = await api.get<unknown>(`/users/me`);
          const currentUser = meData as { id?: number };

          if (isMounted) {
            setCurrentUserId(typeof currentUser.id === "number" ? currentUser.id : null);
          }
        } catch {
          if (isMounted) {
            setCurrentUserId(null);
          }
        }

        try {
          const recData = await api.get<unknown>(`/groups/${groupId}/recommendations`);
          const recommendationData = recData as { recommendations?: unknown[] };

          if (isMounted) {
            setRecommendations(recommendationData.recommendations ?? []);
            setRecommendationsError(null);
            setRecommendationsLoading(false);
          }
        } catch (err: unknown) {
          if (isMounted) {
            setRecommendations([]);
            setRecommendationsLoading(false);

            const apiError = err as { status?: number; message?: string };

            if (apiError.status === 401) {
              router.replace("/login");
              return;
            }

            if (apiError.status === 403) {
              setRecommendationsError("You are not allowed to view this group's recommendations.");
            } else if (apiError.status === 409) {
              setRecommendationsError(
                "Recommendations are not ready yet. Group members need to upload Letterboxd data first."
              );
            } else if (apiError.status === 404) {
              setRecommendationsError("No recommendations found for this group yet.");
            } else {
              setRecommendationsError("Failed to load recommendations. Please try again later.");
            }
          }
        }

        try {
          if (isMounted) {
            setPollResultsLoading(true);
          }

          const resultsData = await api.get<PollResultsResponse>(`/groups/${groupId}/results`);

          if (isMounted) {
            setPollResults(resultsData.topMovies ?? []);
            setPollResultsError(null);
          }
        } catch (err: unknown) {
          if (isMounted) {
            const apiError = err as { status?: number; message?: string };

            setPollResults([]);

            if (apiError.status === 401) {
              router.replace("/login");
              return;
            }

            if (apiError.status === 403) {
              setPollResultsError("You are not allowed to view this group's poll results.");
            } else if (apiError.status === 409) {
              setPollResultsError("Poll results will appear once the poll has finished.");
            } else if (apiError.status === 404) {
              setPollResultsError("No poll results found yet.");
            } else {
              setPollResultsError("Failed to load poll results. Please try again later.");
            }
          }
        } finally {
          if (isMounted) {
            setPollResultsLoading(false);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          setLoading(false);
          setRecommendationsLoading(false);
          if ((err as { status?: number }).status === 401) {
            router.replace("/login");
            return;
          }

          setError("Could not load this group. Please try again.");
        }
      } finally {
        if (isMounted && !group) {
          setLoading(false);
        }
      }
    };

    fetchGroupDetails();

    return () => {
      isMounted = false;
    };
  }, [groupId, router]);

  const joinToken = group?.joinUrl
    ? group.joinUrl.split("/").filter(Boolean).pop() ?? ""
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

  const handleLeaveGroup = async () => {
    try {
      setIsLeaving(true);
      setLeaveError(null);

      const api = new ApiService();
      await api.post(`/groups/${groupId}/leave`);
      router.push("/users/me");
    } catch (err: unknown) {
      setLeaveError("Could not leave the group. Please try again.");
    } finally {
      setIsLeaving(false);
    }
  };

  const handleStartPoll = async () => {
    try {
      setStartingPoll(true);
      setPollError(null);

      const api = new ApiService();
      await api.post(`/groups/${groupId}/poll`);
      setIsStartPollDialogOpen(false);
      router.push(`/groups/${groupId}/poll`);
    } catch (error: unknown) {
      const status = (error as { status?: number }).status;

      if (status === 401) {
        router.replace("/login");
        return;
      }

      if (status === 403) {
        setPollError("You are not allowed to start a poll for this group.");
        window.setTimeout(() => setPollError(null), 7000);
        return;
      }

      if (status === 409) {
        setPollError(
          recommendationsError
            ? "A poll cannot be started yet. Group members need to upload Letterboxd data first."
            : "A poll is already running."
        );
        window.setTimeout(() => setPollError(null), 7000);
        return;
      }

      setPollError("Failed to start poll.");
      window.setTimeout(() => setPollError(null), 7000);
    } finally {
      setStartingPoll(false);
    }
  };

  const handleJoinDrawingSession = async () => {
    if (joiningDrawingSession) return;

    setJoiningDrawingSession(true);
    setDrawingJoinError(null);

    try {
      const api = new ApiService();
      const response = await api.get<DrawingJoinResponse>(`/groups/${groupId}/drawing/join`); router.push(`/groups/${groupId}/canvas?sessionId=${encodeURIComponent(response.sessionId)}`);
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };

      if (apiError.status === 401) {
        router.replace("/login");
        return;
      }

      setDrawingJoinError("Could not join the drawing session. Please try again.");
    } finally {
      setJoiningDrawingSession(false);
    }
  };

  const owner = group?.members.find((member) => member.id === group.ownerId);

  const groupMatchReason = group && group.members.length < 2
    ? "Need at least 2 members to compare taste profiles."
    : "No group match yet because not enough members have uploaded Letterboxd data.";


  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.content}>
          <div className={styles.loadingWrap}>
            <Spin size="large" />
            <p className={styles.helperText}>Loading group details...</p>
          </div>
        </div>
      </main>
    );
  }
  if (error || !group) {
    return (
      <main className={styles.page}>
        <div className={styles.content}>
          <div className={`${styles.warningBox} ${styles.shellCard}`}>
            <p className={styles.warningText}>
              <strong>Error:</strong> {error || "Group could not be found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            <Link href="/users/me" style={{ textDecoration: "none", color: "inherit" }}>
              <div className={styles.brandRow}>
                <img src="/logo.png" alt="logo" className={styles.logo} />
                <h1 className={styles.brand}>Movieblendr.</h1>
              </div>
            </Link>
          </div>
          <div className={styles.heroRight}>
            <Button className={styles.authButton} onClick={() => router.back()}>
              Back
            </Button>
            <Button
              className={styles.authButton}
              onClick={() => { setLeaveError(null); setIsLeaveDialogOpen(true); }}
            >
              Leave Group
            </Button>
          </div>
        </div>

        <div className={styles.section}>
          <div className={`${styles.shellCard} ${styles.softCard} ${styles.groupInviteCard}`}>
            <div className={styles.groupSummaryLayout}>
              <div className={styles.groupSummaryMain}>
                <div
                  className={styles.groupProfilePictureWrap}
                  onClick={handleJoinDrawingSession}
                  style={{ opacity: joiningDrawingSession ? 0.6 : 1 }}
                >
                  {group.groupProfilePicture ? (
                    <img
                      src={group.groupProfilePicture}
                      alt="Group profile picture"
                      className={styles.groupProfilePicture}
                    />
                  ) : (
                    <div className={styles.groupProfilePictureFallback}>
                      <span>No picture</span>
                    </div>
                  )}
                  <div className={styles.groupProfilePictureOverlay}>
                    <span>{joiningDrawingSession ? "Joining..." : "Still Watching?"}</span>
                  </div>
                </div>

                {drawingJoinError && (
                  <p className={styles.helperText} style={{ color: "#e2a684", marginBottom: 8 }}>
                    {drawingJoinError}
                  </p>
                )}

                <h2 className={`${styles.username} ${styles.groupSummaryTitle}`}>
                  {group.name}
                </h2>
                <p className={`${styles.helperText} ${styles.groupSummaryMeta}`}>
                  Owner: <span className={styles.username}>{owner?.username ?? "Unknown"}</span>
                </p>
                <p className={`${styles.helperText} ${styles.groupSummaryMeta}`}>
                  Group ID: <span className={styles.username}> {group.id} </span>
                </p>
                <div className={styles.groupSummaryMembersRow}>
                  <TeamOutlined className={styles.helperText} />
                  <p className={`${styles.helperText} ${styles.groupSummaryMembersText}`}>
                    {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className={`${styles.shellCard} ${styles.softCard} ${styles.groupMatchCard}`}>
                <p className={styles.label}>Group Match</p>
                <p className={`${styles.username} ${styles.groupMatchValue}`}>
                  {/* Temporary buffer for when we'll implement GroupMatch later on */}
                  N/A
                </p>
                <p className={`${styles.helperText} ${styles.groupMatchReason}`}>
                  {groupMatchReason}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={`${styles.shellCard} ${styles.softCard} ${styles.groupInviteCard}`}>
            <h2 className={styles.sectionTitle}>Invite Link</h2>
            <div className={styles.groupInviteRow}>
              <input
                type="text"
                value={fullJoinUrl}
                readOnly
                className={styles.groupInviteInput}
              />
              <Button
                className={`${styles.authButton} ${styles.groupCopyButton}`}
                onClick={handleCopyLink}
                icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={`${styles.shellCard} ${styles.softCard} ${styles.groupRecommendationsCard}`}>
            <h2 className={styles.sectionTitle}>Members</h2>

            {group.members.length === 0 ? (
              <p className={styles.helperText}>No members found.</p>
            ) : (
              <div className={styles.groupRecommendationsList}>
                {group.members.map((member) => (
                  <div key={member.id} className={`${styles.softCard} ${styles.groupRecommendationItem}`}>
                    <div className={styles.groupMemberHeader}>
                      <div className={styles.groupMemberIdentityRow}>
                        <p className={styles.groupMemberName}>{member.username}</p>

                        {currentUserId === member.id && (
                          <span className={`${styles.genrePill} ${styles.groupMemberBadge} ${styles.groupYouBadge}`}>
                            You
                          </span>
                        )}

                        {group.ownerId === member.id && (
                          <span className={`${styles.genrePill} ${styles.groupMemberBadge} ${styles.groupOwnerBadge}`}>
                            Owner
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <div className={`${styles.shellCard} ${styles.softCard} ${styles.groupRecommendationsCard}`}>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                marginBottom: "18px",
              }}
            >
              <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                Group Recommendations
              </h2>

              <Button
                className={styles.authButton}
                onClick={() => {
                  setPollError(null);

                  if (group.ownerId !== currentUserId) {
                    setPollOwnerMessage("Only the group owner can start a poll.");
                    window.setTimeout(() => setPollOwnerMessage(null), 3500);
                    return;
                  }

                  setPollOwnerMessage(null);
                  setIsStartPollDialogOpen(true);
                }}
                loading={startingPoll}
                icon={<PlayCircleOutlined />}
                style={
                  group.ownerId !== currentUserId
                    ? {
                      opacity: 0.55,
                      cursor: "not-allowed",
                    }
                    : undefined
                }
              >
                Start Poll
              </Button>
            </div>

            {pollOwnerMessage && (
              <p className={styles.helperText} style={{ marginTop: "-8px", marginBottom: "12px" }}>
                {pollOwnerMessage}
              </p>
            )}

            {pollError && !isStartPollDialogOpen && (
              <div className={styles.errorAlert} style={{ marginBottom: "12px" }}>
                <p className={styles.warningText}>{pollError}</p>
              </div>
            )}

            {recommendationsLoading ? (
              <div className={styles.groupRecommendationsLoading}>
                <Spin size="large" />
                <p className={styles.groupRecommendationsLoadingText}>
                  Loading recommendations...
                </p>
              </div>
            ) : recommendationsError ? (
              <p className={styles.helperText}>{recommendationsError}</p>
            ) : recommendations.length === 0 ? (
              <p className={styles.helperText}>No recommendations available.</p>
            ) : (
              <div className={styles.groupRecommendationsList}>
                {recommendations
                  .filter((m) => !!(m as { movieId?: string }).movieId)
                  .filter((m, idx, arr) => arr.findIndex((x) => (x as { movieId?: string }).movieId === (m as { movieId?: string }).movieId) === idx)
                  .slice(0, 10)
                  .map((movie) => {
                  const recommendation = movie as {
                    movieId?: string;
                    title?: string;
                  };

                  return (
                    <Link
                      key={recommendation.movieId}
                      href={`/movies/${recommendation.movieId}`}
                      className={styles.groupRecommendationLink}
                    >
                      <div className={`${styles.softCard} ${styles.groupRecommendationItem}`}>
                        <p className={styles.groupRecommendationTitle}>
                          {recommendation.title ?? "Untitled movie"}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className={styles.section}>
          <div className={`${styles.shellCard} ${styles.softCard} ${styles.groupRecommendationsCard}`}>
            <div className={styles.groupSectionHeader}>
              <h2 className={styles.sectionTitle}>Poll Results</h2>
              <p className={styles.helperText}>
                {currentUserId === group.ownerId
                  ? "The owner can start a poll in the recommendations section above."
                  : "Only the group owner can start a poll."}
              </p>
            </div>


            {pollResultsLoading ? (
              <div className={styles.groupRecommendationsLoading}>
                <Spin size="large" />
                <p className={styles.groupRecommendationsLoadingText}>
                  Loading poll results...
                </p>
              </div>
            ) : pollResultsError ? (
              <p className={styles.helperText}>{pollResultsError}</p>
            ) : pollResults.length === 0 ? (
              <p className={styles.helperText}>No poll results available yet.</p>
            ) : (
              <div className={styles.groupRecommendationsList}>
                {pollResults.slice(0, 3).map((movie, index) => (
                  <Link
                    key={movie.movieId}
                    href={`/movies/${movie.movieId}`}
                    className={styles.groupRecommendationLink}
                  >
                    <div className={`${styles.softCard} ${styles.groupRecommendationItem} ${styles.pollResultItemCompact}`}>
                      <div
                        className={`${styles.pollResultRankCompact} ${index === 0
                          ? styles.pollResultRankGold
                          : index === 1
                            ? styles.pollResultRankSilver
                            : styles.pollResultRankBronze
                          }`}
                      >
                        {index + 1}
                      </div>

                      <div className={styles.pollResultInfoCompact}>
                        <p className={styles.groupRecommendationTitle}>{movie.title}</p>
                      </div>

                      <div className={styles.pollResultVotesCompact}>
                        {movie.votes > 1 && <TeamOutlined />}
                        {movie.votes === 1 && <UserOutlined />}
                        <span>{movie.votes} vote{movie.votes !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isStartPollDialogOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            if (!startingPoll) {
              setIsStartPollDialogOpen(false);
              setPollError(null);
            }
          }}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Start poll?</h3>
            <p className={styles.modalSubtitle}>
              This will notify all group members that a poll has started so they can join and vote.
            </p>

            {pollError && (
              <div className={styles.errorAlert}>
                <p className={styles.warningText}>{pollError}</p>
              </div>
            )}

            <div className={styles.modalActions}>
              <Button
                className={styles.modalCancelButton}
                onClick={() => {
                  setIsStartPollDialogOpen(false);
                  setPollError(null);
                }}
                disabled={startingPoll}
              >
                Cancel
              </Button>
              <Button
                className={styles.modalConfirmButton}
                onClick={handleStartPoll}
                disabled={startingPoll}
                loading={startingPoll}
                icon={<PlayCircleOutlined />}
              >
                Start Poll
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLeaveDialogOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => { if (!isLeaving) setIsLeaveDialogOpen(false); }}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Leave group?</h3>
            <p className={styles.modalSubtitle}>
              You will be removed from this group and redirected back to your profile.
            </p>

            {leaveError && (
              <div className={styles.errorAlert}>
                <p className={styles.warningText}>{leaveError}</p>
              </div>
            )}

            <div className={styles.modalActions}>
              <Button
                className={styles.modalCancelButton}
                onClick={() => setIsLeaveDialogOpen(false)}
                disabled={isLeaving}
              >
                Cancel
              </Button>
              <Button
                className={styles.modalConfirmButton}
                onClick={handleLeaveGroup}
                disabled={isLeaving}
                loading={isLeaving}
              >
                Leave Group
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}