#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { GaFargateServiceStack } from '../lib/ga-fargate-service-stack';

const app = new cdk.App();
new GaFargateServiceStack(app, 'GaFargateServiceStack');
