#!/bin/bash

# Generate a secure AUTH_SECRET for NextAuth.js
echo "Generating a secure AUTH_SECRET..."
echo ""

SECRET=$(openssl rand -base64 32)

echo "Your AUTH_SECRET:"
echo "================================"
echo "$SECRET"
echo "================================"
echo ""
echo "Add this to your .env.local file:"
echo "AUTH_SECRET=$SECRET"
echo ""
echo "⚠️  Keep this secret secure and never commit it to git!"

