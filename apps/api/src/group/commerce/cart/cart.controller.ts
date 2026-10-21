import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthUser, CartResponse } from '@kia./shared';
import { IsString, MinLength } from 'class-validator';
import { CurrentUser } from '@kia./platform';
import { JwtAuthGuard } from '@kia./platform';
import { CartService } from './cart.service';

class AddToCartBodyDto {
  @IsString()
  @MinLength(1)
  courseSlug!: string;
}

class ApplyDiscountBodyDto {
  @IsString()
  @MinLength(1)
  code!: string;
}

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: AuthUser): Promise<CartResponse> {
    return this.cartService.getCart(user.id);
  }

  @Post('items')
  addItem(@CurrentUser() user: AuthUser, @Body() dto: AddToCartBodyDto): Promise<CartResponse> {
    return this.cartService.addCourse(user.id, dto.courseSlug);
  }

  @Delete('items/:itemId')
  removeItem(
    @CurrentUser() user: AuthUser,
    @Param('itemId') itemId: string,
  ): Promise<CartResponse> {
    return this.cartService.removeItem(user.id, itemId);
  }

  @Delete('courses/:slug')
  removeCourse(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
  ): Promise<CartResponse> {
    return this.cartService.removeCourse(user.id, slug);
  }

  @Delete()
  clear(@CurrentUser() user: AuthUser): Promise<CartResponse> {
    return this.cartService.clearCart(user.id);
  }

  @Post('discount')
  applyDiscount(
    @CurrentUser() user: AuthUser,
    @Body() dto: ApplyDiscountBodyDto,
  ): Promise<CartResponse> {
    return this.cartService.applyDiscount(user.id, dto.code);
  }

  @Delete('discount')
  removeDiscount(@CurrentUser() user: AuthUser): Promise<CartResponse> {
    return this.cartService.removeDiscount(user.id);
  }
}
