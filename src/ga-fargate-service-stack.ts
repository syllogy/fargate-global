import * as certmgr from '@aws-cdk/aws-certificatemanager';
import { Vpc } from '@aws-cdk/aws-ec2';
import { Cluster, ContainerImage, TaskDefinition, Compatibility } from '@aws-cdk/aws-ecs';
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns';
import * as ga from '@aws-cdk/aws-globalaccelerator';
import * as route53 from '@aws-cdk/aws-route53';
import * as cdk from '@aws-cdk/core';

// Route 53 hosted zone info
const DEFAULT_ZONE_ID = 'Z2N5MJJUEIAVLZ';
const DEFAULT_ZONE_NAME = 'demo.pahud.net';

/**
 * The fargate ALB service stack
 */
export class FargateAlbSvcStack extends cdk.Stack {
  readonly service: ApplicationLoadBalancedFargateService;
  readonly dnsName: string;
  readonly loadBalancerArn: string;
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const accont = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;

    const ACM_CERT_ARN: {[region:string]: string} = {
      'ap-northeast-1': `arn:aws:acm:ap-northeast-1:${accont}:certificate/93b6c17e-0558-4bda-b831-a50821b75d03`,
      'us-west-2': `arn:aws:acm:us-west-2:${accont}:certificate/d8afb61a-3bd2-4b71-8462-009e4871d26f`,
    };

    const vpc = new Vpc(this, 'VPC', { natGateways: 1 });

    const cluster = new Cluster(this, 'Cluster', { vpc });

    const taskDefinition = new TaskDefinition(this, 'Task', {
      compatibility: Compatibility.FARGATE,
      memoryMiB: '512',
      cpu: '256',
    });

    taskDefinition
      .addContainer('flask', {
        image: ContainerImage.fromRegistry('pahud/amazon-ecs-flask-sample'),
        // image: ContainerImage.fromAsset(path.join(__dirname, '../../python/flask-docker-app/')),
        environment: {
          PLATFORM: `AWS Fargate(${region})`,
        },
      })
      .addPortMappings({
        containerPort: 80,
      });

    const certificate = certmgr.Certificate.fromCertificateArn(this, 'AcmCert', ACM_CERT_ARN[region]);

    this.service = new ApplicationLoadBalancedFargateService(this, 'FargateService', {
      cluster,
      taskDefinition,
      certificate,
      domainName: `${region}.${DEFAULT_ZONE_NAME}`,
      domainZone: route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId: DEFAULT_ZONE_ID,
        zoneName: DEFAULT_ZONE_NAME,
      }),
    });
    this.dnsName = this.service.loadBalancer.loadBalancerDnsName;
    this.loadBalancerArn = this.service.loadBalancer.loadBalancerArn;
    new cdk.CfnOutput(this, 'DnsName', { value: this.dnsName });
    new cdk.CfnOutput(this, 'LoadBalancerArn', { value: this.service.loadBalancer.loadBalancerArn });
  }
}

/**
 * The GA Provider
 */
export class GlobalAcceleratorProvider extends cdk.Construct {
  readonly endpointgroups: {[region: string]: ga.EndpointGroup} = {};
  readonly dnsName: string;
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    const accelerator = new ga.Accelerator(this, id);
    const listener = new ga.Listener(this, 'Listener', {
      accelerator,
      portRanges: [
        { fromPort: 80, toPort: 80 },
        { fromPort: 443, toPort: 443 },
      ],
    });
    const endpointGroupJP = new ga.EndpointGroup(this, 'EndpointGroupJP', {
      listener,
      region: 'ap-northeast-1',
    });
    const endpointGroupUS = new ga.EndpointGroup(this, 'EndpointGroupUS', {
      listener,
      region: 'us-west-2',
    });
    this.endpointgroups['us-west-2'] = endpointGroupUS;
    this.endpointgroups['ap-northeast-1'] = endpointGroupJP;

    this.dnsName = accelerator.dnsName;
  }
}


export interface Route53ProviderProps {
  readonly globalAcceleratorDnsName: string;
  readonly regionalCname: { [region: string]: string };
}

export class Route53Provider extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: Route53ProviderProps) {
    super(scope, id);

    // ga.demo.pahud.net CNAME to GA DnsName
    const cname = new route53.CnameRecord(this, 'CnameGA', {
      domainName: props.globalAcceleratorDnsName,
      recordName: 'ga',
      zone: route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId: DEFAULT_ZONE_ID,
        zoneName: DEFAULT_ZONE_NAME,
      }),
    });
    new cdk.CfnOutput(this, 'GAEndpoint', { value: `https://${cname.domainName}` });

    // print out https://{region}.demo.pahud.net
    new cdk.CfnOutput(this, 'GAEndpoint-us-west-2', { value: `https://us-west-2.${DEFAULT_ZONE_NAME}` });
    new cdk.CfnOutput(this, 'GAEndpoint-ap-northeast-1', { value: `https://ap-northeast-1.${DEFAULT_ZONE_NAME}` });
  }
}
