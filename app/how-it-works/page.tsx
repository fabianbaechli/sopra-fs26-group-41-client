"use client";

import Link from "next/link";
import { Button, Card, Typography } from "antd";
import {
  UploadOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import styles from "@/styles/page.module.css";

const { Title, Text, Paragraph } = Typography;

export default function HowItWorksPage() {
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
          </div>

          <div className={styles.heroRight}>
            <Link href="/users/me">
              <Button className={styles.authButton}>Back</Button>
            </Link>
          </div>
        </div>

        <Card className={styles.shellCard}>
          <div className={styles.section}>
            <Title
              level={2}
              className={styles.sectionTitle}
              style={{ marginTop: -40 }}
            >
              How Movieblendr Works
            </Title>
            <Paragraph className={styles.helperText}>
              Movieblendr helps groups choose a movie by combining the taste profiles of all
              group members.{" "}
              <a href="https://letterboxd.com" target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
                Letterboxd
              </a>{" "}
              is a social platform for logging and rating movies, think of it as a diary for
              everything you&apos;ve watched. Instead of asking users to manually select preferences
              from a small sample, Movieblendr uses your exported Letterboxd rating history to
              estimate your taste automatically.
            </Paragraph>
          </div>

          <div className={styles.infoGrid}>
            <Card className={styles.softCard}>
              <div className={styles.label}>
                <UploadOutlined /> Step 1
              </div>
              <Title level={4} className={styles.username}>
                Upload your Letterboxd export
              </Title>
              <Text className={styles.helperText}>
                Export your Letterboxd data and upload the ZIP file. The app reads your{" "}
                <strong>rated movies only</strong> other entries, watchlist, and liked films
                are not used, and builds a personal taste profile from that history.
              </Text>
            </Card>

            <Card className={styles.softCard}>
              <div className={styles.label}>
                <TeamOutlined /> Step 2
              </div>
              <Title level={4} className={styles.username}>
                Create or join a group
              </Title>
              <Text className={styles.helperText}>
                Group members bring their own taste profiles. Movieblendr then compares the
                combined group taste instead of only looking at one person.
              </Text>
            </Card>

            <Card className={styles.softCard}>
              <div className={styles.label}>
                <ThunderboltOutlined /> Step 3
              </div>
              <Title level={4} className={styles.username}>
                Generate recommendations
              </Title>
              <Text className={styles.helperText}>
                The recommendation service looks for movies that fit the group and avoids movies
                that members have already rated.
              </Text>
            </Card>

            <Card className={styles.softCard}>
              <div className={styles.label}>
                <CheckCircleOutlined /> Step 4
              </div>
              <Title level={4} className={styles.username}>
                Vote in a poll
              </Title>
              <Text className={styles.helperText}>
                The group can vote on recommended movies. The result gives everyone a shared
                decision instead of an endless discussion.
              </Text>
            </Card>
          </div>

          <div className={styles.section}>
            <Title level={3} className={styles.sectionTitle}>
              What happens under the hood?
            </Title>
            <Paragraph className={styles.helperText}>
              When a user uploads their Letterboxd data, Movieblendr extracts movie titles,
              ratings, and basic statistics. These ratings are mapped to internal movie entries.
              Under the hood, the recommendation service uses the MovieLens dataset, which
              contains a very large collection of movie ratings from many different users (32 million ratings). Based
              on this data, we created a weighted graph structure that allows the system to
              statistically estimate a user&apos;s movie preferences and compare them with other users
              and groups. Due to the MovieLens dataset being from 2023, movies released after that time cannot be considered when computing overlaps.
            </Paragraph>
            <Paragraph className={styles.helperText}>
              The system also uses the OMDb API to retrieve movie metadata such as posters,
              genres, runtimes, descriptions, directors, and ratings. This additional information
              helps make the recommendations easier to understand for users, while the underlying
              recommendation logic stays focused on identifying movies the whole group is likely
              to enjoy.
            </Paragraph>
          </div>
        </Card>
      </div>
    </div>
  );
}