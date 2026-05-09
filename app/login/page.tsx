"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { LoginRequest, LoginResponse } from "@/types/user";
import { Button, Form, Input, Typography, Alert } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import Link from "next/link";
import styles from "../styles/page.module.css";



const Login: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    set: setToken
  } = useLocalStorage<string>("token", "");

  const handleLogin = async (values: LoginRequest) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiService.post<LoginResponse>("/login", values);
      setToken(response.token);
      const pendingRedirect = localStorage.getItem("pendingRedirect");
      if (pendingRedirect) {
        localStorage.removeItem("pendingRedirect");
        router.push(pendingRedirect);
        return;
      }
      router.push("/users/me");
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) {
        setErrorMessage("Wrong username or password.");
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.headerSection}>
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className={styles.brandRow}>
            <img src="/logo.png" alt="logo" className={styles.logo} />
            <h1 className={styles.brand}>
              Movieblendr.
            </h1>
          </div>
        </Link>
        <Typography.Text
          type="secondary"
          style={{ display: "block", marginTop: "8px" }}
        >
          Welcome back! Login to continue
        </Typography.Text>
      </div>

      <div className={styles.formCard}>
        <Typography.Title level={3} className={styles.formTitle}>
          Login
        </Typography.Title>

        {errorMessage && (
          <Alert
            description={errorMessage}
            type="error"
            showIcon
            className={styles.errorAlert}
          />
        )}

        <Form
          form={form}
          name="login"
          size="large"
          layout="vertical"
          onFinish={handleLogin}
          requiredMark={false}
        >
          <Form.Item
            name="username"
            label={<span className={styles.labelSpan}>Username</span>}
            rules={[{ required: true, message: "Please input your username!" }]}
          >
            <Input
              prefix={<UserOutlined className={styles.inputIcon} />}
              placeholder="Enter your username"
            />
          </Form.Item>
          <Form.Item
            name="password"
            label={<span className={styles.labelSpan}>Password</span>}
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <Input.Password
              prefix={<LockOutlined className={styles.inputIcon} />}
              placeholder="Enter your password"
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              className={styles.loginButton}
            >
              Login
            </Button>
          </Form.Item>
        </Form>
        <div className={styles.registerTextContainer}>
          <Typography.Text>
            Don&apos;t have an account? <Link href="/register" className={styles.registerLink}>Register</Link>
          </Typography.Text>
        </div>
      </div>
    </div>
  );
};

export default Login;
