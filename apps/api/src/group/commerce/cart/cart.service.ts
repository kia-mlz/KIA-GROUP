import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  hasCourseEntitlement,
  normalizePaymentSettings,
  entitlementKey,
  type CartItemResponse,
  type CartResponse,
} from '@kia./shared';
import { PrismaService } from '@kia./platform';
import { SiteSettingsService } from '@kia./platform';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteSettings: SiteSettingsService,
  ) {}

  async getCart(userId: string): Promise<CartResponse> {
    const cart = await this.ensureCart(userId);
    return this.toResponse(cart.id, userId);
  }

  async addCourse(userId: string, courseSlug: string): Promise<CartResponse> {
    const slug = courseSlug.trim();
    if (!slug) throw new BadRequestException('courseSlug is required');

    const course = await this.prisma.course.findFirst({
      where: { OR: [{ slug }, { id: slug }], published: true },
    });
    if (!course) throw new NotFoundException(`Course ${slug} not found`);

    const entitlements = await this.prisma.entitlement.findMany({ where: { userId } });
    const entitlementKeys = entitlements.map((e) => entitlementKey(e.resourceType, e.resourceId));
    if (hasCourseEntitlement(entitlementKeys, course.slug)) {
      throw new ConflictException('Course is already purchased');
    }

    const cart = await this.ensureCart(userId);
    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_courseId: { cartId: cart.id, courseId: course.id } },
    });
    if (existing) {
      throw new ConflictException('Course is already in the cart');
    }

    await this.prisma.cartItem.create({
      data: { cartId: cart.id, courseId: course.id },
    });
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });

    return this.toResponse(cart.id, userId);
  }

  async removeItem(userId: string, itemId: string): Promise<CartResponse> {
    const cart = await this.ensureCart(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException(`Cart item ${itemId} not found`);

    await this.prisma.cartItem.delete({ where: { id: item.id } });
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });
    return this.toResponse(cart.id, userId);
  }

  async removeCourse(userId: string, courseSlug: string): Promise<CartResponse> {
    const cart = await this.ensureCart(userId);
    const course = await this.prisma.course.findFirst({
      where: { OR: [{ slug: courseSlug }, { id: courseSlug }] },
    });
    if (!course) throw new NotFoundException(`Course ${courseSlug} not found`);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, courseId: course.id },
    });
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });
    return this.toResponse(cart.id, userId);
  }

  async clearCart(userId: string): Promise<CartResponse> {
    const cart = await this.ensureCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { updatedAt: new Date() },
    });
    return this.toResponse(cart.id, userId);
  }

  private async ensureCart(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  private async toResponse(cartId: string, userId: string): Promise<CartResponse> {
    const settings = await this.siteSettings.get();
    const payment = normalizePaymentSettings(settings.payment);
    const unitPrice = settings.pricing.courseCents;
    const siteName = settings.general.siteName || 'کیا.';

    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: { course: true },
        },
      },
    });

    // Drop already-purchased courses that may have been granted elsewhere.
    const entitlements = await this.prisma.entitlement.findMany({ where: { userId } });
    const entitlementKeys = entitlements.map((e) => entitlementKey(e.resourceType, e.resourceId));
    const idsToRemove: string[] = [];
    const kept = [];
    for (const item of cart.items) {
      if (hasCourseEntitlement(entitlementKeys, item.course.slug)) {
        idsToRemove.push(item.id);
        continue;
      }
      kept.push(item);
    }
    if (idsToRemove.length > 0) {
      await this.prisma.cartItem.deleteMany({ where: { id: { in: idsToRemove } } });
    }

    const trackMap = new Map(settings.tracks.map((t) => [t.key, t.name]));
    const items: CartItemResponse[] = kept.map((item) => {
      const discountCents = 0;
      const priceCents = unitPrice;
      const instructor =
        (item.course.trackKey && trackMap.get(item.course.trackKey)) || siteName;
      return {
        id: item.id,
        courseId: item.courseId,
        courseSlug: item.course.slug,
        title: item.course.title,
        thumbnail: item.course.icon || '📘',
        instructor,
        trackKey: item.course.trackKey,
        priceCents,
        discountCents,
        finalPriceCents: priceCents - discountCents,
        addedAt: item.createdAt.toISOString(),
      };
    });

    const subtotalCents = items.reduce((s, i) => s + i.priceCents, 0);
    const discountCents = items.reduce((s, i) => s + i.discountCents, 0);
    const totalCents = items.reduce((s, i) => s + i.finalPriceCents, 0);

    return {
      id: cart.id,
      items,
      itemCount: items.length,
      subtotalCents,
      discountCents,
      totalCents,
      currency: payment.currency,
      updatedAt: cart.updatedAt.toISOString(),
    };
  }
}
